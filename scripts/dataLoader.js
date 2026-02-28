// 안드레이님의 KB(Knowledge Base)를 불러오는 모듈
const GITHUB_USER = "dalma-lgtm"; // ⚠️ 본인 ID로 변경!
const REPO_NAME = "AndreyTORFL2";     // ⚠️ 저장소 이름 확인!

export async function fetchVocabulary() {
    const url = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/data/vocabulary.json`;
    try {
        const res = await fetch(url);
        if(!res.ok) throw new Error("파일 없음");
        return await res.json();
    } catch (e) {
        console.error("KB 로딩 실패:", e);
        return [];
    }
}
