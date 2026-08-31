"""
HTML templates for Vanna Agents servers.
"""

from html import escape
from typing import Optional


def get_vanna_component_script(
    dev_mode: bool = False,
    static_path: str = "/static",
    cdn_url: Optional[str] = None,
) -> str:
    """Get the script tag for loading Vanna web components.

    Args:
        dev_mode: If True, force local static files
        static_path: Path to static assets in dev mode
        cdn_url: Optional explicit CDN override. By default, use the bundled asset.

    Returns:
        HTML script tag for loading components
    """
    if cdn_url and not dev_mode:
        return f'<script type="module" src="{cdn_url}"></script>'
    return f'<script type="module" src="{static_path}/vanna-components.js"></script>'


def get_index_html(
    dev_mode: bool = False,
    static_path: str = "/static",
    cdn_url: Optional[str] = None,
    api_base_url: str = "",
    logged_in_email: Optional[str] = None,
) -> str:
    """Generate index HTML with configurable component loading.

    Args:
        dev_mode: If True, load components from local static files
        static_path: Path to static assets in dev mode
        cdn_url: Optional explicit CDN override for the components
        api_base_url: Base URL for API endpoints
        logged_in_email: Validated local demo identity selected by the server

    Returns:
        Complete HTML page as string
    """
    component_script = get_vanna_component_script(dev_mode, static_path, cdn_url)
    safe_email = escape(logged_in_email or "", quote=True)
    login_hidden = " hidden" if logged_in_email else ""
    authenticated_hidden = "" if logged_in_email else " hidden"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanna Agents Chat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {{
            theme: {{
                extend: {{
                    colors: {{
                        'vanna-navy': '#023d60',
                        'vanna-cream': '#e7e1cf',
                        'vanna-teal': '#15a8a8',
                        'vanna-orange': '#fe5d26',
                        'vanna-magenta': '#bf1363',
                    }},
                    fontFamily: {{
                        'sans': ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
                        'serif': ['Roboto Slab', 'ui-serif', 'Georgia'],
                        'mono': ['Space Mono', 'ui-monospace', 'monospace'],
                    }}
                }}
            }}
        }}
    </script>
    <style>
        body {{
            background: linear-gradient(to bottom, #e7e1cf, #ffffff, #e7e1cf);
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }}

        /* Background decorations matching landing page */
        body::before {{
            content: '';
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            /* Radial gradients with brand colors */
            background:
                radial-gradient(circle at top left, rgba(21, 168, 168, 0.12), transparent 60%),
                radial-gradient(circle at bottom right, rgba(254, 93, 38, 0.08), transparent 65%);
        }}

        body::after {{
            content: '';
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            /* Dot pattern with retro computing aesthetic */
            background-image: radial-gradient(circle at 2px 2px, rgba(2, 61, 96, 0.3) 1px, transparent 0);
            background-size: 32px 32px;
            /* Grid overlay */
            background-image:
                radial-gradient(circle at 2px 2px, rgba(2, 61, 96, 0.3) 1px, transparent 0),
                linear-gradient(rgba(2, 61, 96, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(2, 61, 96, 0.1) 1px, transparent 1px);
            background-size: 32px 32px, 100px 100px, 100px 100px;
        }}

        /* Ensure content is above background */
        body > * {{
            position: relative;
            z-index: 1;
        }}

        vanna-chat {{
            width: 100%;
            height: 100%;
            display: block;
        }}
    </style>
    {component_script}
</head>
<body>
    <div class="max-w-6xl mx-auto p-5">
        <!-- Header -->
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-vanna-navy mb-2 font-serif">Vanna Agents</h1>
            <p class="text-lg font-mono font-bold text-vanna-teal mb-4">DATA-FIRST AGENTS</p>
            <p class="text-slate-600 mb-4">Interactive AI Assistant powered by Vanna Agents Framework</p>
            <a href="javascript:window.location='view-source:'+window.location.href" class="inline-flex items-center gap-2 px-4 py-2 bg-vanna-teal text-white text-sm font-medium rounded-lg hover:bg-vanna-navy transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                </svg>
                View Page Source
            </a>
        </div>

        {('    <div class="bg-vanna-orange/10 border border-vanna-orange/30 rounded-lg p-3 mb-5 text-vanna-orange text-sm font-medium">📦 Development Mode: Loading components from local assets</div>' if dev_mode else "")}

        <!-- Login Form -->
        <div id="loginContainer" class="max-w-md mx-auto mb-10 bg-white p-8 rounded-xl shadow-lg border border-vanna-teal/30{login_hidden}">
            <div class="text-center mb-6">
                <h2 class="text-2xl font-semibold text-vanna-navy mb-2 font-serif">Login to Continue</h2>
                <p class="text-sm text-slate-600">Select your email to access the chat</p>
            </div>

            <form id="loginForm" method="post" action="/login">
            <div class="mb-5">
                <label for="emailInput" class="block mb-2 text-sm font-medium text-vanna-navy">Email Address</label>
                <select
                    id="emailInput"
                    name="email"
                    required
                    class="w-full px-4 py-3 text-sm border border-vanna-teal/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-vanna-teal focus:border-transparent bg-white"
                >
                    <option value="">Select an email...</option>
                    <option value="admin@example.com">admin@example.com</option>
                    <option value="user@example.com">user@example.com</option>
                </select>
            </div>

            <button type="submit" id="loginButton" class="w-full px-4 py-3 bg-vanna-teal text-white text-sm font-medium rounded-lg hover:bg-vanna-navy focus:outline-none focus:ring-2 focus:ring-vanna-teal focus:ring-offset-2 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                Continue
            </button>
            </form>

            <div class="mt-5 p-3 bg-vanna-teal/10 border-l-4 border-vanna-teal rounded text-xs text-vanna-navy leading-relaxed">
                <strong>Local Demo Mode:</strong> The server validates this local role and stores it in a cookie.
                This is not production authentication.
            </div>
        </div>

        <!-- Logged In Status (hidden by default) -->
        <div id="loggedInStatus" class="{authenticated_hidden} text-center p-4 bg-vanna-teal/10 border border-vanna-teal/30 rounded-lg mb-5">
            Logged in as <span id="loggedInEmail" class="font-semibold text-vanna-navy">{safe_email}</span>
            <br>
            <form method="post" action="/logout" class="inline">
            <button type="submit" id="logoutButton" class="mt-2 px-3 py-1.5 bg-vanna-navy text-white text-xs rounded hover:bg-vanna-teal transition">
                Logout
            </button>
            </form>
        </div>

        <!-- Chat Container (hidden by default) -->
        <div id="chatSections" class="{authenticated_hidden}">
            <div class="bg-white rounded-xl shadow-lg h-[600px] overflow-hidden border border-vanna-teal/30">
                <vanna-chat
                    api-base="{api_base_url}"
                    sse-endpoint="{api_base_url}/api/vanna/v3/chat_sse"
                    poll-endpoint="{api_base_url}/api/vanna/v3/chat_poll">
                </vanna-chat>
            </div>

            <div class="mt-8 p-5 bg-white rounded-lg shadow border border-vanna-teal/30">
                <h3 class="text-lg font-semibold text-vanna-navy mb-3 font-serif">API Endpoints</h3>
                <ul class="space-y-2">
                    <li class="p-2 bg-vanna-cream/50 rounded font-mono text-sm">
                        <span class="font-bold text-vanna-teal mr-2">POST</span>{api_base_url}/api/vanna/v3/chat_sse - Server-Sent Events streaming
                    </li>
                    <li class="p-2 bg-vanna-cream/50 rounded font-mono text-sm">
                        <span class="font-bold text-vanna-teal mr-2">POST</span>{api_base_url}/api/vanna/v3/chat_poll - Request/response polling
                    </li>
                    <li class="p-2 bg-vanna-cream/50 rounded font-mono text-sm">
                        <span class="font-bold text-vanna-teal mr-2">GET</span>{api_base_url}/health - Health check
                    </li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        // Fallback if web component doesn't load
        if (!customElements.get('vanna-chat')) {{
            setTimeout(() => {{
                if (!customElements.get('vanna-chat')) {{
                    document.querySelector('vanna-chat').innerHTML = `
                        <div class="p-10 text-center text-gray-600">
                            <h3 class="text-xl font-semibold mb-2">Vanna Chat Component</h3>
                            <p class="mb-2">Web component failed to load. Please check your connection.</p>
                            <p class="text-sm text-gray-400">
                                {("Loading from: local static assets" if not cdn_url else f"Loading from: {cdn_url}")}
                            </p>
                        </div>
                    `;
                }}
            }}, 2000);
        }}
    </script>
</body>
</html>"""


# Default production HTML
INDEX_HTML = get_index_html()
