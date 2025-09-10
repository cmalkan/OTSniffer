# OTSniffer

Minimal dashboard for exploring operational technology (OT) exposure via [Shodan](https://www.shodan.io/).

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Provide a Shodan API key via the `SHODAN_API_KEY` environment variable. You can place it in a `.env` file or export it directly in your shell.

## Usage

Run the Streamlit dashboard:

```bash
streamlit run dashboard.py
```

Choose an industry from the provided list and optionally scope the search to a two-letter country code. The dashboard displays the number of results and up to 20 matches with their IP address, organization and product information.

## Docker

Build and run the dashboard in a container:

```bash
docker build -t otsniffer .
docker run -e SHODAN_API_KEY=your_key -p 8501:8501 otsniffer
```

## Future work

This project is a starting point and will evolve to link with the CertLoop repo for certificate analysis.
