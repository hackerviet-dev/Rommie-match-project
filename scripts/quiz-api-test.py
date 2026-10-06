"""Local integration: quiz validation, persistence, retakes and recalculation."""
import json
import uuid
from urllib.request import Request, urlopen
from urllib.error import HTTPError

def call(path, method='GET', body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    try:
        with urlopen(Request('http://localhost:5000' + path, method=method, headers=headers,
                             data=None if body is None else json.dumps(body).encode())) as response:
            return response.status, json.loads(response.read() or 'null')
    except HTTPError as error:
        return error.code, json.loads(error.read() or 'null')

code, quiz = call('/api/matching/quiz')
assert code == 200 and len(quiz['questions']) == 5
assert call('/api/matching/me/quiz')[0] == 401
email = 'quiz-ui-' + uuid.uuid4().hex + '@example.test'
password = 'LocalQuizTest123!'
code, session = call('/api/auth/register', 'POST', {'email': email, 'password': password, 'displayName': 'Quiz UI Test', 'gender': 'male', 'city': 'TP. Hồ Chí Minh'})
assert code in [200, 201]
token = session['accessToken']
assert call('/api/matching/me/quiz', token=token)[0] == 403
onboarding = {'name': 'Quiz UI Test', 'age': '24', 'gender': 'Nam', 'city': 'TP. Hồ Chí Minh',
              'employment': 'Khác', 'orgName': '', 'sleep': '22h–0h', 'env': 'Yên tĩnh',
              'yn': {'smoke': 'Không', 'drink': 'Không', 'pets': 'Không'}, 'hasRoom': 'no',
              'distance': '2–5 km', 'roomType': 'Phòng riêng', 'moveInDate': '2026-10-15'}
assert call('/api/users/me/onboarding', 'PUT', onboarding, token)[0] == 200
assert call('/api/matching/me/quiz', token=token)[0] == 204
assert call('/api/matching/me/quiz', 'PUT', {'answers': {}}, token)[0] == 400
answers = {question['id']: question['options'][0]['id'] for question in quiz['questions']}
code, result = call('/api/matching/me/quiz', 'PUT', {'answers': answers}, token)
assert code == 200 and result['answers'] == answers
assert result['traits'] == {'noiseTolerance': 88, 'tidiness': 95, 'earlyBird': 10, 'costSplit': 'split_evenly'}
assert call('/api/matching/me/quiz', token=token) == (200, result)
invalid = {**answers, quiz['questions'][0]['id']: 'unknown'}
assert call('/api/matching/me/quiz', 'PUT', {'answers': invalid}, token)[0] == 400
assert call('/api/matching/me/quiz', token=token) == (200, result)
retake = {question['id']: question['options'][-1]['id'] for question in quiz['questions']}
code, replaced = call('/api/matching/me/quiz', 'PUT', {'answers': retake}, token)
assert code == 200 and replaced['answers'] == retake and replaced['completedAt'] == result['completedAt']
assert replaced['traits'] != result['traits']
code, login = call('/api/auth/login', 'POST', {'email': email, 'password': password})
assert code == 200 and call('/api/matching/me/quiz', token=login['accessToken']) == (200, replaced)
assert call('/api/matching/me/recalculate', 'POST', token=token)[0] == 200
print('PASS: questions, auth/onboarding, empty/invalid answers, save/read, server scoring, retake replacement, login persistence, recalculate')
print('UI fixture:', email, session['user']['id'])
