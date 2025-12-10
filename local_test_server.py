import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime

PORT = 8000
DIRECTORY = "."

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Mock Arkade Auth Status
        if path == '/api/arkade/auth-status':
            self.send_json({'bypass': True, 'message': 'Local Test Server Bypass'})
            return

        # Mock Token Verify
        if path == '/api/arkade/verify':
            # Check Authorization header? SIMPLE MOCK:
            auth_header = self.headers.get('Authorization', '')
            
            if 'mock-admin-token-123' in auth_header:
                self.send_json({
                    'valid': True,
                    'username': 'admin',
                    'is_admin': True,
                    'bypass': True
                })
            else:
                 # Default TestPilot or Invalid?
                 # Let's keep TestPilot for convenience if needed, or invalidate.
                 # User wants STRICT testing.
                 self.send_json({
                    'valid': True,
                    'username': 'TestPilot',
                    'is_admin': False, # Demote TestPilot
                    'bypass': True
                })
            return

        # Mock Ad Astra Player Data
        if path == '/api/adastra/player':
            print("Requesting mock player data...")
            # We return a basic user so valid play is possible immediately.
            self.send_json({
                'username': 'TestPilot',
                'pilot_name': 'Ace Test',
                'ship_name': 'The Debugger',
                'credits': 99999,
                'turns': 100,
                'current_sector': 1,
                'ship_type': 'scout',
                'ship_variant': 1,
                'is_admin': True,
                'cargo': '{"Ore": 10, "Fuel": 50}',
                'equipment': '{}',
                'game_state': {
                    'username': 'TestPilot',
                    'pilotName': 'Ace Test',
                    'credits': 99999,
                    'turns': 100,
                    'maxTurns': 100,
                    'currentSector': 1,
                    'ship': {'name': 'The Debugger', 'type': 'scout', 'hull': 100, 'hullMax': 100, 'shields': 50, 'shieldsMax': 50, 'cargoMax': 20},
                    'shipVariant': 1,
                    'cargo': {'Ore': 10, 'Fuel': 50},
                    'stats': {'sectorsVisited': 1},
                    'created': 1733560000000
                }
            })
            return

        # Mock Stats
        if path == '/api/adastra/admin/stats':
            self.send_json({
                'totalPlayers': 5,
                'activeSessions': 1,
                'serverTime': 'Mock Time'
            })
            return

        # Fallback to static files
        super().do_GET()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        length = int(self.headers.get('content-length', 0))
        if length > 0:
            body = self.rfile.read(length).decode('utf-8')
            print(f"POST {path} Body: {body}")
        
        # Mock Login
        if path == '/api/arkade/login':
            try:
                data = json.loads(body)
            except:
                data = {}
            
            username = data.get('username', '')
            password = data.get('password', '')

            if username == 'admin' and password == 'admin123':
                self.send_json({
                    'success': True,
                    'token': 'mock-admin-token-123',
                    'username': 'admin',
                    'is_admin': True,
                    'pilot_name': 'Admin Pilot',
                    'ship_name': 'Admin Ship'
                })
            else:
                self.send_json({
                    'success': False,
                    'error': 'Invalid credentials'
                })
            return

        # Mock Register
        if path == '/api/arkade/register':
            self.send_json({
                'success': True,
                'token': 'mock-token-123',
                'username': 'TestPilot'
            })
            return
            
        # Mock Logout
        if path == '/api/arkade/logout':
            self.send_json({'success': True})
            return

        # Mock Ad Astra Player Update (PUT)
        if path == '/api/adastra/player' and self.command == 'POST': # The client sends PUT as POST using fetch? No, fetch sends PUT.
             pass

        # Mock Reset Galaxy
        if path == '/api/adastra/admin/reset-galaxy':
             self.send_json({'success': True, 'message': 'Mock players reset'})
             return

        pass

        # Mock Galaxy Generation
        if path == '/api/adastra/admin/galaxy/generate':
            print("Mocking galaxy generation...")
            try:
                data = json.loads(body)
                size = data.get('size', 100)
                self.send_json({
                    'success': True,
                    'size': size,
                    'message': f'Mock galaxy generated with {size} sectors'
                })
            except:
                self.send_json({'success': False, 'error': 'Invalid JSON'})
            return

        # Correctly handle PUT requests
    def do_PUT(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        length = int(self.headers.get('content-length', 0))
        if length > 0:
            body = self.rfile.read(length).decode('utf-8')
            print(f"PUT {path} Body: {body}")

        if path == '/api/adastra/player':
            self.send_json({'success': True})
            return
            
        self.send_error(404, "Not Found")

        self.send_error(404, "Not Found")

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

os.chdir(DIRECTORY)
print(f"Server started at http://localhost:{PORT}")
print(f"Serving directory: {os.getcwd()}")
print("Mock API active: /api/arkade/*")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
