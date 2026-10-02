"""Run against a local API: python scripts/test-openapi-docs.py http://localhost:5000."""
import json
import sys
from urllib.request import urlopen

with urlopen((sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5000') + '/openapi/v1.json') as response:
    document = json.load(response)

count = 0
for path, item in document['paths'].items():
    for method, operation in item.items():
        if method not in ('get', 'post', 'put', 'delete', 'patch'):
            continue
        count += 1
        assert operation.get('summary') and operation.get('description'), (method, path)
        for parameter in operation.get('parameters', []):
            assert parameter['name'] != 'Offset', path
            assert parameter.get('description'), (path, parameter['name'])
        if 'requestBody' in operation:
            assert operation['requestBody'].get('description'), path
        if operation.get('security'):
            assert '401' in operation['responses'] and '403' in operation['responses'], path

schemas = document['components']['schemas']
for name, schema in schemas.items():
    if name.endswith('Request'):
        for field, definition in schema.get('properties', {}).items():
            assert definition.get('description'), (name, field)
assert set(schemas['RegisterRequest']['required']) == {'email', 'password', 'displayName', 'city'}
assert not schemas['RefundRequest'].get('required')
assert schemas['ReviewVerificationRequest']['required'] == ['status']
assert 'cleanliness' in schemas['SaveLifestylePreferencesRequest']['required']
assert 'maxOccupants' in schemas['SaveRoomRequest']['required']
assert 'bedrooms' not in schemas['SaveRoomRequest']['required']
assert '201' in document['paths']['/api/rooms']['post']['responses']
assert '204' in document['paths']['/api/auth/logout']['post']['responses']
health = document['paths']['/api/hyperlocal/health']['get']
assert not health.get('parameters') and not health.get('requestBody') and not health.get('security')
assert 'database' in health['description']
assert not any('mock-gateway' in path or 'webhook' in path for path in document['paths'])
assert count >= 59, count
print(f'PASS: {count} operations; parameter/body descriptions, request schemas, auth and status codes.')
