// src/components/inbox/getTimeAgo.ts
export function getTimeAgo(dateStr: string, lang: 'ko' | 'en'): string {
    const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return textByLang('just now', '방금 전');
    if (mins < 60) return textByLang(`${mins}m ago`, `${mins}분 전`);
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return textByLang(`${hrs}h ago`, `${hrs}시간 전`);
    const days = Math.floor(hrs / 24);
    if (days < 7) return textByLang(`${days}d ago`, `${days}일 전`);
    return new Date(dateStr).toLocaleDateString();
}
