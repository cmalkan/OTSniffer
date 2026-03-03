# OTSniffer

Minimal dashboard for exploring operational technology (OT) exposure via [Shodan](https://www.shodan.io/).

## Install
### Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Provide a Shodan API key via the `SHODAN_API_KEY` environment variable. You can place it in a `.env` file or export it directly in your shell.

###j Usage

Run the Streamlit dashboard:

```bash
streamlit run dashboard.py
```

Choose an industry from the provided list and optionally scope the search to a two-letter country code. The dashboard displays the number of results and up to 20 matches with their IP address, organization and product information.

## Docker

Build and run the dashboard in a container:

```bash
```
#### Docker build
docker build -t OTSniffer:1.0 .

#### Docker Run
docker run --rm -e SHODAN_API_KEY=fnWsFlfN9iHRrFahpW12J2ZgvMX2dOBG -p 8501:8501 otsniffer:1.0 streamlit run /app/dashboard.py

#### Template site
Local URL: http://localhost:8501

```
```
## Future
This project is a starting point and will evolve to link with the CertLoop repo for certificate analysis.


## dependencies
[https://docs.streamlit.io/develop/api-reference/write-magic]
[https://developer.shodan.io/api]


## Other Ideas
Reference: https://chatgpt.com/c/69a51185-d648-8325-a4a3-ca18cf2481f3

Create a new category:
**Industrial Cyber Risk Simulation** — a platform that models ransomware propagation, containment failure, and financial downtime impact in OT environments.

---

### Why *Not* To Do It

1. **Market Readiness Risk**
   Executives think in compliance and insurance forms, not probabilistic simulation.
   You may need to educate the market from scratch.

2. **Data Quality Problem**
   Many factories lack accurate network diagrams.
   Simulation requires clean architecture data.

3. **Big Vendor Gravity**
   OT security giants could bolt on “risk scoring” if your differentiation is shallow.

4. **Capital & Time Intensive**
   Category creation = 3–5 year commitment.
   Not a side project.

5. **High Technical Complexity**
   Attack graphs + cyber-physical modeling + financial conversion = non-trivial engineering.

6. **Credibility & Liability Risk**
   If your model is wrong, trust collapses.

7. **Unclear Buyer Persona**
   CISO? COO? CFO? Insurer?
   New categories fail when ownership is ambiguous.

---

### When It *Does* Make Sense

* If OT ransomware risk keeps increasing (it is).
* If insurers demand quantification (they are).
* If boards want dollar-based exposure (they do).
* If no dominant simulation platform exists (currently true).

---

### The Core Decision

This only makes sense if:

* You are willing to commit 3+ years.
* You want to build a category, not incremental SaaS.
* You have unfair advantage (OT + 62443 depth + industry access).
* You can recruit serious technical talent.

---

### The Real Fork

Do you want:

A) Profitable niche SaaS
B) Category-defining company
C) Consulting + product assist

Category creation only works if you choose B and commit fully.

That’s the distilled reality.


### Writing a curl in python
response = requests.get('https://api.shodan.io/tools/myip?key=SHODAN_API_KEY')
        st.write(response.text)
