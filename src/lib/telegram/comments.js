import { $fetch } from 'ofetch'
import * as cheerio from 'cheerio'
import { getEnv } from '../env'

/**
 * Experimental: Fetch comments (discussion thread) for a channel post and extract image URLs.
 * This is additive-only and won’t affect existing logic.
 * It best-effort parses Telegram embed pages; if structure changes or comments are unavailable,
 * it returns an empty list rather than throwing.
 */
export async function getComments(Astro, { id, limit = 50 } = {}) {
  try {
    if (!id) return { images: [], videos: [] }

    const host = getEnv(import.meta.env, Astro, 'HOST') ?? 't.me'
    const channel = getEnv(import.meta.env, Astro, 'CHANNEL')
    const staticProxy = getEnv(import.meta.env, Astro, 'STATIC_PROXY') ?? '/static/'

    if (!channel) return { images: [], videos: [] }

    // Step 1: Load post embed page to discover the discussion link
    const postUrl = `https://${host}/${channel}/${id}?embed=1&mode=tme`
    const postHtml = await $fetch(postUrl, { retry: 2, retryDelay: 100 })
    const $post = cheerio.load(postHtml, {}, false)

    // Heuristic: find inline button that links to discussion thread
    // Possible forms: /c/<groupId>/<topicId>, /<groupUsername>/<topicId>, query with comment=, etc.
    const buttons = $post('.tgme_widget_message_inline_button')
      .map((_i, el) => $post(el).attr('href'))
      .get()
      .filter(Boolean)

    let discussionPath = ''
    for (const href of buttons) {
      try {
        const u = new URL(href, `https://${host}`)
        // Prefer paths that are not bots, not add stickers, length >= 2 segments
        if (u.pathname.split('/').filter(Boolean).length >= 2) {
          discussionPath = u.pathname + (u.search || '')
          break
        }
      }
      catch {}
    }

    // Fallback: handle anchors with ?comment=xxx (common when comments go to a linked group)
    if (!discussionPath) {
      const commentHref = $post('a[href*="?comment="]').first().attr('href')
      if (commentHref) {
        try {
          const u = new URL(commentHref, `https://${host}`)
          // Probe the comment URL with embed=1 to discover data-telegram-post (e.g. JVID_NO2/11493)
          const probeUrl = `${u.origin}${u.pathname}${u.search}${u.search ? '&' : '?'}embed=1`
          const probeHtml = await $fetch(probeUrl, { retry: 2, retryDelay: 100 })
          const m = probeHtml.match(/data-telegram-post=["']([^"']+)["']/i)
          if (m && m[1] && m[1].includes('/')) {
            // Build discussion path like /<group>/<topicId>
            discussionPath = `/${m[1]}`
          }
        }
        catch {}
      }
    }

    if (!discussionPath) {
      return { images: [], videos: [] }
    }

    // Step 2: Load discussion thread (embed) to parse comments
    const discussUrl = `https://${host}${discussionPath}${discussionPath.includes('?') ? '&' : '?'}embed=1`
    const discussHtml = await $fetch(discussUrl, { retry: 2, retryDelay: 100 })
    const $ = cheerio.load(discussHtml, {}, false)

    // Step 3: Extract images from messages under discussion
    const images = []
    const videos = []
    $('.tgme_widget_message_wrap .tgme_widget_message')
      .slice(0, limit)
      .each((_index, item) => {
        const styleVal = $(item).find('.tgme_widget_message_photo_wrap').attr('style')
        if (styleVal) {
          const url = styleVal.match(/url\(["'](.*?)["']\)/)?.[1]
          if (url) images.push(staticProxy + url)
        }

        // Extract standard/round videos (skip animated stickers)
        const vid = $(item).find('.tgme_widget_message_video_wrap video')
        const round = $(item).find('.tgme_widget_message_roundvideo_wrap video')
        const vsrc = vid.attr('src')
        const rsrc = round.attr('src')
        if (vsrc) videos.push(staticProxy + vsrc)
        if (rsrc) videos.push(staticProxy + rsrc)
      })

    return { images, videos }
  }
  catch {
    return { images: [], videos: [] }
  }
}


