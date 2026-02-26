export interface NewsItem {
  id: number;
  title: string;
  url: string;
  source_name: string | null;
  published_at: string | null;
  summary: string | null;
  fetched_at: string;
}
