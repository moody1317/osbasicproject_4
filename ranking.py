import sqlite3
import math
from collections import defaultdict

def calculate_party_performance_and_save():
    # performance.db에서 의원별 정당과 총점 같이 가져오기
    conn = sqlite3.connect("performance.db")
    cur = conn.cursor()
    cur.execute("SELECT HG_NM, POLY_NM, 총점 FROM performance_score")
    rows = cur.fetchall()
    conn.close()

    # 정당별 점수 수집
    party_scores = defaultdict(list)
    for name, party, score in rows:
        if party:
            party_scores[party].append(score)

    # 정당별 평균 및 가중 점수 계산
    party_rankings = []
    for party, scores in party_scores.items():
        avg = sum(scores) / len(scores)
        weighted = round(avg * math.log(len(scores) + 1), 2)
        party_rankings.append((party, round(avg, 2), len(scores), weighted))

    # 가중 점수 기준 내림차순 정렬
    party_rankings.sort(key=lambda x: x[3], reverse=True)

    # 결과 DB에 저장
    conn = sqlite3.connect("ranking.db")
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS party_score")
    cur.execute("""
        CREATE TABLE party_score (
            POLY_NM TEXT PRIMARY KEY,
            평균실적 REAL,
            의원수 INTEGER,
            가중점수 REAL
        )
    """)
    for poly_nm, avg_score, count, weighted_score in party_rankings:
        cur.execute("""
            INSERT INTO party_score VALUES (?, ?, ?, ?)
        """, (poly_nm, avg_score, count, weighted_score))

    conn.commit()
    conn.close()
    print("✅ 모든 정당의 순위가 'ranking.db'에 저장되었습니다.")

if __name__ == "__main__":
    calculate_party_performance_and_save()

    # 저장결과 확인 (깔끔한 출력)
    conn = sqlite3.connect("ranking.db")
    cur = conn.cursor()
    cur.execute("SELECT * FROM party_score ORDER BY 가중점수 DESC")

    print(f"{'정당명':<15} {'평균실적':>10} {'의원수':>8} {'가중점수':>12}")
    for poly_nm, avg_score, count, weighted_score in cur.fetchall():
        print(f"{poly_nm:<15} {avg_score:10.2f} {count:8d} {weighted_score:12.2f}")

    conn.close()
