# Report Fetch Port Check

Command run: `Test-NetConnection 127.0.0.1 -Port 8080`

Result: port `8080` is reachable, so the local server is running.

Likely cause of `Failed to fetch`: the report page was opened directly from the filesystem instead of through `http://127.0.0.1:8080/corrected-analysis.html`, or the browser blocked the local fetch context.
