import requests
import json

# 1. API URL 설정
api_url = "https://open.assembly.go.kr/portal/openapi/nwvrqwxyaytdsfvhu"

# 2. API 키 설정
api_key = "927928bf24af47d4afa7b805ed0bf4fc"

# 3. 요청 파라미터 설정 (필수 파라미터 포함)
params = {
    "KEY": api_key,            # API 키를 파라미터로 전달
    "Type": "json",            # 응답 형식 (json 또는 xml)
    "pIndex": "1",             # 페이지 번호
    "pSize": "10",             # 페이지당 결과 수
    "BILL_NO": ""              # 검색할 의안번호 (선택적)
    # 필요에 따라 다른 파라미터 추가
}

# 4. API 요청 보내기 (GET 방식)
response = requests.get(api_url, params=params)

# 5. 응답 확인
if response.status_code == 200:  # 성공적인 응답
    try:
        # JSON 형식으로 변환
        data = response.json()
        
        # 데이터 처리
        print("API 응답 결과:")
        print(json.dumps(data, indent=4, ensure_ascii=False))
    except json.JSONDecodeError:
        print("JSON 변환 실패. 응답 내용:")
        print(response.text)
else:
    print(f"API 요청 실패: {response.status_code}")
    print(response.text)