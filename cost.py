import requests
import json

# API 기본 정보
api_key = "927928bf24af47d4afa7b805ed0bf4fc"
api_url = "https://open.assembly.go.kr/portal/openapi/nkalemivaqmoibxro"  # 요청 주소

# API 요청 파라미터 설정
params = {
    "KEY": api_key,
    "Type": "json",
    "pIndex": "1",
    "pSize": "1000",
    "AGE": "22"  # 22대 국회
}

# API 요청
print("국회 API 호출 중...")
response = requests.get(api_url, params=params)

# 응답 확인
if response.status_code == 200:
    try:
        # JSON 형식으로 변환
        data = response.json()
        
        # 응답 구조 확인
        print("\n최상위 키:")
        print(list(data.keys()))
        
        # API 이름 추출 (URL에서)
        api_name = api_url.split('/')[-1]
        
        # 일반적인 API 응답 구조 처리
        if api_name in data:
            api_data = data[api_name]
            
            if isinstance(api_data, list) and len(api_data) > 1:
                # 두 번째 항목에서 'row' 데이터 추출
                second_item = api_data[1]
                
                if isinstance(second_item, dict) and 'row' in second_item:
                    rows = second_item['row']
                    print(f"총 {len(rows)}개의 데이터를 가져왔습니다.")
                    
                    # 첫 번째 행의 모든 필드 확인 (디버깅용)
                    if len(rows) > 0:
                        print("\n첫 번째 항목의 모든 필드:")
                        for key, value in rows[0].items():
                            print(f"- {key}: {value}")
                    
                    # AGE와 BILL_ID만 추출
                    filtered_data = []
                    
                    for row in rows:
                        # AGE와 BILL_ID 추출
                        age = row.get("AGE", "")
                        bill_id = row.get("BILL_ID", "")
                        
                        # 결과 추가
                        filtered_data.append({
                            "AGE": age,
                            "BILL_ID": bill_id
                        })
                    
                    # 결과 출력
                    print("\nAGE와 BILL_ID 목록:")
                    for i, item in enumerate(filtered_data):
                        print(f"{i+1}. AGE: {item['AGE']}, BILL_ID: {item['BILL_ID']}")
                    
                    # 결과를 JSON 파일로 저장
                    output_data = {
                        "data": filtered_data
                    }
                    
                    with open("cost.json", "w", encoding="utf-8") as f:
                        json.dump(output_data, f, ensure_ascii=False, indent=2)
                    print(f"\n{len(filtered_data)}개의 정보가 'age_bill_id_data.json' 파일로 저장되었습니다.")
                else:
                    print("'row' 키를 찾을 수 없습니다.")
                    if isinstance(second_item, dict):
                        print("두 번째 항목의 키:", list(second_item.keys()))
            else:
                print("API 응답 구조가 예상과 다릅니다.")
                if isinstance(api_data, list):
                    print(f"API 데이터 리스트 길이: {len(api_data)}")
                    if len(api_data) > 0:
                        print("첫 번째 항목:", api_data[0])
        
        # 오류 응답인 경우
        elif 'RESULT' in data and 'CODE' in data['RESULT']:
            print(f"오류: {data['RESULT']['CODE']} - {data['RESULT']['MESSAGE']}")
            
            # 파라미터 정보 출력
            print("\n사용된 파라미터:")
            for key, value in params.items():
                print(f"- {key}: {value}")
        else:
            print("예상치 못한 응답 구조입니다.")
            print("응답 내용:")
            print(json.dumps(data, indent=2, ensure_ascii=False)[:500])
    
    except json.JSONDecodeError:
        print("JSON 파싱 오류. 응답이 JSON 형식이 아닙니다.")
        print("응답 내용:")
        print(response.text[:500])
else:
    print(f"API 요청 실패: {response.status_code}")
    print("응답 내용:")
    print(response.text[:500])
