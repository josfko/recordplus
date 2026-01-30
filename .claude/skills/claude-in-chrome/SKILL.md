---
name: claude-in-chrome
description: Browser automation using Claude in Chrome MCP. Navigate pages, click, type, fill forms, read console logs, manage tabs, and record GIFs. Must be connected at all times.
license: Complete terms in LICENSE.txt
---

# Claude in Chrome

Use the **claude-in-chrome MCP** for all browser automation. This MCP must be connected at all times.

## Prerequisites

The claude-in-chrome MCP must be connected. To verify:
1. Run `/chrome` to check connection status
2. If not connected, start Claude Code with `claude --chrome` or run `/chrome` and select "Enabled by default"

## Available Capabilities

Claude in Chrome provides these tools (run `/mcp` → `claude-in-chrome` to see full list):

| Capability | Description |
|------------|-------------|
| Navigate | Go to URLs, follow links |
| Click | Click buttons, links, elements |
| Type | Enter text in inputs, forms |
| Scroll | Scroll pages and containers |
| Read console | View console logs, errors, network requests |
| Manage tabs | Create, switch, close tabs |
| Resize window | Change viewport dimensions |
| Record GIFs | Capture interaction sequences |

## Common Patterns

### Test a Local Web Application

```
Open localhost:5173, try submitting the login form with invalid data,
and check if the error messages appear correctly.
```

### Debug with Console Logs

```
Open the dashboard page at localhost:5173/dashboard and check the
console for any errors when the page loads.
```

### Verify UI Matches Design

```
Open localhost:5173/company/AAPL and verify the layout matches
the design - check that the header, sidebar, and main content
areas are positioned correctly.
```

### Test Form Validation

```
Go to localhost:5173/screener, try adding filters with edge case
values, and verify the validation works correctly.
```

### Extract Page Data

```
Open the screener page and extract all company tickers and their
current prices from the table. List them in a summary.
```

### Multi-Step User Flow

```
Test the complete user flow: go to the homepage, click on a company
in the 52-week lows list, verify the company page loads, then
navigate back using the browser back button.
```

### Record a Demo

```
Record a GIF showing how to use the filter bar on the screener page -
demonstrate adding a filter, changing values, and clearing it.
```

## Best Practices

- **Wait for pages to load**: Ask Claude to wait for specific elements or content before interacting
- **Be specific about selectors**: Reference elements by visible text, role, or unique identifiers
- **Handle auth manually**: When Claude encounters login pages, handle authentication yourself then tell Claude to continue
- **Use fresh tabs**: If a tab becomes unresponsive, ask Claude to create a new one
- **Filter console output**: Tell Claude what patterns to look for rather than asking for all console output

## Troubleshooting

### Extension Not Detected

1. Verify Claude in Chrome extension (v1.0.36+) is installed
2. Verify Claude Code (v2.0.73+) with `claude --version`
3. Check Chrome is running
4. Run `/chrome` → "Reconnect extension"

### "Browser extension is not connected" Error (macOS)

This happens when Claude Desktop and Claude Code CLI compete for the Chrome extension. The native messaging host config points to Claude Desktop instead of Claude Code.

**Fix:** Run this command to update the config:

```bash
cat > ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.anthropic.claude_browser_extension.json << 'EOF'
{
  "name": "com.anthropic.claude_browser_extension",
  "description": "Claude Browser Extension Native Host",
  "path": "/Users/jo/.claude/chrome/chrome-native-host",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://dihbgbndebgnbjfmelmegjepbnkhlgni/",
    "chrome-extension://fcoeoabgfenejglbffodgkkbkcdhcgfn/",
    "chrome-extension://dngcpimnedloihjnnfngkgjoidhnaolf/"
  ]
}
EOF
```

Then **restart Chrome completely** (Cmd+Q, then reopen).

**Note:** If you update Claude Desktop, it may overwrite this config. Rerun the fix if needed. See [GitHub issue #20298](https://github.com/anthropics/claude-code/issues/20298) for updates.

### Browser Not Responding

1. Check for modal dialogs (alert, confirm, prompt) blocking the page
2. Ask Claude to create a new tab
3. Restart Chrome extension (disable/re-enable)

### Permission Issues

Site permissions are inherited from the Chrome extension. Manage in Chrome extension settings.

## Integration with Development Workflow

Since claude-in-chrome uses your actual browser session:

- **Already logged in**: Access authenticated apps (Google Docs, Notion, etc.) without API setup
- **Real environment**: Test with your actual cookies, localStorage, extensions
- **Visible actions**: Watch Claude interact with your browser in real time

## When NOT to Use Browser Testing

- **Static HTML inspection**: Just read the HTML file directly
- **API testing**: Use curl/httpie via Bash instead
- **Headless CI/CD**: Claude in Chrome requires a visible browser window
