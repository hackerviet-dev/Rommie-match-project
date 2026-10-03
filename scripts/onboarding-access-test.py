"""Integration regression for mandatory onboarding against a local API.

Creates two isolated accounts; prints their IDs for local fixture cleanup.
Run after applying migrations: python scripts/onboarding-access-test.py
"""
import json
import os
import uuid
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = os.environ.get('TEST_API_URL', 'http://localhost:5000')

def call(path, method='GET', body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    request = Request(BASE + path, method=method, headers=headers,
                      data=None if body is None else json.dumps(body).encode())
    try:
        with urlopen(request) as response:
            return response.status, json.loads(response.read() or 'null')
    except HTTPError as error:
        return error.code, json.loads(error.read() or 'null')

assert call('/api/users/me/onboarding')[0] == 401
document = call('/openapi/v1.json')[1]
assert document['paths']['/api/users/me/profile']['get']['security'] == [{'Bearer': []}]
assert 'security' not in document['paths']['/api/auth/login']['post']
fixture_ids = []
for has_room in ['no', 'yes']:
    email = f'onboarding-{uuid.uuid4().hex}@example.test'
    password = uuid.uuid4().hex + 'Aa1!'
    code, session = call('/api/auth/register', 'POST', {
        'email': email, 'password': password, 'displayName': 'Onboarding Test',
        'city': 'TP. Hồ Chí Minh', 'gender': 'male',
    })
    assert code in [200, 201], (code, session)
    fixture_ids.append(session['user']['id'])
    token = session['accessToken']
    assert call('/api/users/me/onboarding', token=token) == (200, {'isComplete': False})
    assert call('/api/users/me/profile', token=token)[0] == 200
    for path in ['/api/users/profiles', '/api/users/me/lifestyle', '/api/rooms', '/api/billing/plans', '/hubs/chat/negotiate']:
        code, result = call(path, 'POST' if 'negotiate' in path else 'GET', token=token)
        assert code == 403 and result['code'] == 'onboarding_required', (path, code, result)
    assert call('/api/auth/me', token=token)[0] == 200
    assert call('/api/users/me/onboarding', 'PUT', {}, token)[0] == 400
    assert not call('/api/users/me/onboarding', token=token)[1]['isComplete']
    values = {
        'name': 'Onboarding Test', 'age': '24', 'gender': 'Nam', 'city': 'TP. Hồ Chí Minh',
        'employment': 'Đang đi làm', 'orgName': 'Test Company', 'bio': 'Test profile',
        'sleep': '22h–0h', 'env': 'Yên tĩnh', 'yn': {'smoke': 'Không', 'drink': 'Không', 'pets': 'Có'},
        'cleanliness': 5, 'extroversion': 25, 'budgetMin': 4, 'budgetMax': 8, 'hasRoom': has_room,
        'distance': '2–5 km', 'roomType': 'Phòng riêng', 'moveInDate': '2026-10-15',
        'addr': '123 Test Street', 'district': 'Quận 1', 'bedrooms': '2', 'area': '45',
        'rent': '3.500.000', 'needed': '1', 'moveIn': '2026-10-15', 'houseType': 'Căn hộ',
        'amenities': ['Wifi'],
    }
    for invalid in [{'yn': {}}, {'budgetMin': 10, 'budgetMax': 3}, {'hasRoom': 'invalid'}, {'age': '0'},
                    {'moveIn' if has_room == 'yes' else 'moveInDate': '2026-02-30'}]:
        assert call('/api/users/me/onboarding', 'PUT', {**values, **invalid}, token)[0] == 400
    assert call('/api/users/me/onboarding', 'PUT', values, token) == (200, {'isComplete': True})
    assert call('/api/users/profiles', token=token)[0] == 200
    code, lifestyle = call('/api/users/me/lifestyle', token=token)
    assert code == 200 and lifestyle['cleanliness'] == 5 and lifestyle['budgetMin'] == 4000000
    assert lifestyle['petFriendly'] and not lifestyle['smoking']
    profile = call('/api/users/me/profile', token=token)[1]
    assert profile['occupation'] == 'Đang đi làm' and profile['birthYear'] is not None
    assert profile['occupationStatus'] == 'employed' and profile['organizationName'] == 'Test Company'
    assert profile['hasRoom'] == (has_room == 'yes') and profile['onboardingCompletedAt']
    assert profile['onboarding'] == {**values, 'hideOrg': False}, profile['onboarding']
    assert profile['lifestyle'] == lifestyle
    assert lifestyle['drinking'] is False and lifestyle['extroversion'] == 25
    assert lifestyle['preferredDistance'] == ('2_5km' if has_room == 'no' else None)
    assert lifestyle['preferredRoomType'] == ('private' if has_room == 'no' else None)
    own_by_id = call(f"/api/users/{session['user']['id']}/profile", token=token)[1]
    assert own_by_id == profile
    if len(fixture_ids) > 1:
        code, other_profile = call(f'/api/users/{fixture_ids[0]}/profile', token=token)
        assert code == 200
        for private_key in ['onboarding', 'lifestyle', 'organizationName', 'hideOrganization', 'onboardingCompletedAt']:
            assert private_key not in other_profile, (private_key, other_profile)
    # Invalid re-submission cannot overwrite a previously valid profile.
    assert call('/api/users/me/onboarding', 'PUT', {**values, 'name': ''}, token)[0] == 400
    code, login = call('/api/auth/login', 'POST', {'email': email, 'password': password})
    assert code == 200
    assert call('/api/users/me/onboarding', token=login['accessToken']) == (200, {'isComplete': True})
    assert call('/api/users/me/profile', token=login['accessToken'])[1]['onboarding'] == profile['onboarding']
print('PASS: unauthenticated access, incomplete API/hub blocking, validation, both branches, persistence after login')
print('Fixture IDs:', ','.join(fixture_ids))
