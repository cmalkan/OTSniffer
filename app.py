from flask import Flask, render_template, request, jsonify, Response
import os
import json
from datetime import datetime, timedelta
from collections import Counter, defaultdict

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'demo_data.json')


def load_demo_items():
    try:
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            payload = json.load(f)
        return payload.get('items', [])
    except Exception:
        return []


def parse_date(s: str):
    try:
        return datetime.strptime(s, '%Y-%m-%d').date()
    except Exception:
        return None


def filter_items(items, industry=None, country=None, start_date=None, end_date=None):
    res = []
    for it in items:
        if industry and it.get('industry') != industry:
            continue
        if country and it.get('country') != country:
            continue
        d = parse_date(it.get('date', ''))
        if start_date and (not d or d < start_date):
            continue
        if end_date and (not d or d > end_date):
            continue
        res.append(it)
    return res


def aggregates(items):
    total = sum(it.get('count', 0) for it in items)
    by_industry = Counter()
    by_country = Counter()
    by_vendor = Counter()
    timeline = defaultdict(int)

    for it in items:
        by_industry[it.get('industry')] += it.get('count', 0)
        by_country[it.get('country')] += it.get('count', 0)
        by_vendor[it.get('vendor')] += it.get('count', 0)
        d = parse_date(it.get('date', ''))
        if d:
            timeline[d.isoformat()] += it.get('count', 0)

    def top_n(counter, n=6):
        return [{'name': k, 'count': v} for k, v in counter.most_common(n)]

    timeline_sorted = sorted(timeline.items())
    tl_labels = [k for k, _ in timeline_sorted]
    tl_values = [v for _, v in timeline_sorted]

    return {
        'total': total,
        'industries': top_n(by_industry),
        'countries': top_n(by_country),
        'vendors': top_n(by_vendor),
        'timeline': {
            'labels': tl_labels,
            'values': tl_values
        }
    }


def period_range(period: str, items):
    today = max([parse_date(it['date']) for it in items if parse_date(it['date'])] or [datetime.utcnow().date()])
    if period == '7d':
        start = today - timedelta(days=6)
    elif period == '90d':
        start = today - timedelta(days=89)
    else:
        start = today - timedelta(days=29)
    return start, today


@app.route('/')
def index():
    items = load_demo_items()
    industry = request.args.get('industry') or ''
    country = request.args.get('country') or ''
    period = request.args.get('period') or '30d'

    start, end = period_range(period, items)
    filtered = filter_items(items, industry=industry or None, country=country or None, start_date=start, end_date=end)
    aggs = aggregates(filtered)

    industries = sorted({it['industry'] for it in items})
    countries = sorted({it['country'] for it in items})

    return render_template('index.html', data=aggs, filters={
        'industry': industry,
        'country': country,
        'period': period,
        'industries': industries,
        'countries': countries
    })


@app.route('/api/aggregates')
def api_aggregates():
    items = load_demo_items()
    q = request.args
    industry = q.get('industry') or None
    country = q.get('country') or None
    start = q.get('start')
    end = q.get('end')
    start_date = parse_date(start) if start else None
    end_date = parse_date(end) if end else None
    filtered = filter_items(items, industry=industry, country=country, start_date=start_date, end_date=end_date)
    return jsonify(aggregates(filtered))


@app.route('/health')
def health():
    return {'status': 'ok'}


@app.route('/export.csv')
def export_csv():
    items = load_demo_items()
    industry = request.args.get('industry') or None
    country = request.args.get('country') or None
    period = request.args.get('period') or '30d'
    start, end = period_range(period, items)
    filtered = filter_items(items, industry=industry, country=country, start_date=start, end_date=end)
    aggs = aggregates(filtered)

    import io
    buf = io.StringIO()
    buf.write('category,name,count\n')
    for r in aggs['industries']:
        buf.write(f"industry,{r['name']},{r['count']}\n")
    for r in aggs['countries']:
        buf.write(f"country,{r['name']},{r['count']}\n")
    for r in aggs['vendors']:
        buf.write(f"vendor,{r['name']},{r['count']}\n")
    csv_data = buf.getvalue()
    return Response(csv_data, mimetype='text/csv', headers={'Content-Disposition': 'attachment; filename="otsniffer_aggregates.csv"'})


if __name__ == '__main__':
    app.run(debug=os.getenv('FLASK_DEBUG','0')=='1', host='0.0.0.0', port=int(os.getenv('PORT', '5000')))

