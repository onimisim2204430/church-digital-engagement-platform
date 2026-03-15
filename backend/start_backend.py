#!/usr/bin/env python
"""
Start the Church Digital Platform backend with proper WebSocket support.

This script starts the Daphne ASGI server which supports both HTTP and WebSocket.
Django's development server (runserver) does NOT support WebSocket.

Usage:
    python start_backend.py                    # Default: localhost:8000
    python start_backend.py --port 9000        # Custom port
    python start_backend.py --reload            # With auto-reload on code changes
    python start_backend.py --prod              # Production mode (no reload)
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description='Start Church Digital Platform backend', add_help=True)
    parser.add_argument('--port', type=int, default=8000, help='Port to run server on (default: 8000)')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--reload', action='store_true', help='Auto-reload on code changes (development)')
    parser.add_argument('--prod', action='store_true', help='Production mode (no reload)')
    parser.add_argument('--verbose', action='store_true', help='Verbose logging')
    args = parser.parse_args()
    
    # Ensure we're in backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Set Django settings
    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
    
    # Build Daphne command
    cmd = [
        sys.executable,
        '-m',
        'daphne',
        f'--bind={args.host}',
        f'--port={args.port}',
    ]
    
    # Add reload flag if development
    if args.reload and not args.prod:
        cmd.append('--reload')
    
    # Add verbosity
    if args.verbose:
        cmd.append('--verbosity=3')
    else:
        cmd.append('--verbosity=2')
    
    # Add application
    cmd.append('config.asgi:application')
    
    print(f"\n" + "="*80)
    print("🚀 CHURCH DIGITAL PLATFORM - BACKEND SERVER")
    print("="*80)
    print(f"\n✓ Server: Daphne ASGI (with WebSocket support)")
    print(f"✓ Address: http://{args.host}:{args.port}")
    print(f"✓ API: http://{args.host}:{args.port}/api/v1/")
    print(f"✓ WebSocket: ws://{args.host}:{args.port}/ws/notifications/")
    print(f"✓ Django Admin: http://{args.host}:{args.port}/admin/")
    print(f"✓ Auto-reload: {'ON' if (args.reload and not args.prod) else 'OFF'}")
    print("\n" + "-"*80)
    print("Starting server... (Press Ctrl+C to stop)\n")
    
    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped")
        sys.exit(0)
    except FileNotFoundError:
        print("\n❌ ERROR: Daphne not found")
        print("\nInstall with: pip install daphne channels")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
