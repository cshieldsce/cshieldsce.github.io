import { getCollection } from 'astro:content';
import { articlesFor } from './projects';

export async function getAllArticles() {
  return [...(await getCollection('articles')), ...(await getCollection('synced'))];
}

export async function getSeriesArticles(series: string) {
  return articlesFor(series, await getAllArticles());
}
