require('dotenv').config()

import fs from 'fs'
import converter from '@tryghost/html-to-mobiledoc'
import plugins from '@tryghost/kg-parser-plugins'

let articles
let processedArticles = []

fs.readFile('data/freecodecamp.article.json', 'utf8', (err, data) => {
  if (err) throw err
  articles = JSON.parse(data)

  const returnAuthorIdForUserName = username => {
    switch (username) {
      case 'quincylarson':
        return '5c0e8aa92dd08205fc25e342'
      case 'beaucarnes':
        return '5c0e8a912dd08205fc25e33f'
      case 'abbeyrenn':
        return '5c0e8a4b2dd08205fc25e33c'
      default:
        return '1' // set by default to freeCodeCamp.org owner account
    }
  }

  const isPodcastiframeRegex = /^<iframe style=/
  const embedPodcastPlugin = (node, builder, { addSection, nodeFinished }) => {
    const { nodeType, tagName, outerHTML } = node

    if (
      nodeType !== 1 ||
      tagName !== 'IFRAME' ||
      true !== (outerHTML && isPodcastiframeRegex.test(outerHTML))
    ) {
      return
    }

    let payload = {
      html: outerHTML
    }

    const cardSection = builder.createCardSection('embed', payload)
    addSection(cardSection)

    nodeFinished()
  }
  plugins.push(embedPodcastPlugin)

  const isYouTubeStringRegex = /\s(the freeCodeCamp.org YouTube channel)\s/
  const isYouTubeIdRegex = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/

  const embedYouTubePlugin = (node, builder, { addSection, nodeFinished }) => {
    const { nodeType, tagName, textContent } = node
    if (
      nodeType !== 1 ||
      tagName !== 'P' ||
      true !== (textContent && isYouTubeStringRegex.test(textContent))
    ) {
      return
    }

    const href = node.firstElementChild.href
    const anchorMarkup = builder.createMarkup('a', { href })

    const prevNodeMarker = builder.createMarker(node.firstChild.textContent)
    const thisNodeMarker = builder.createMarker(
      'the freeCodeCamp.org YouTube channel',
      [anchorMarkup]
    )
    const nextNodeMarker = builder.createMarker(node.lastChild.textContent)

    const markupSection = builder.createMarkupSection('p', [
      prevNodeMarker,
      thisNodeMarker,
      nextNodeMarker
    ])
    addSection(markupSection)

    const urlShortId = href.match(isYouTubeIdRegex)[1]
    const html =
      '<iframe width="480" height="270" src="' +
      'https://www.youtube.com/embed/' +
      urlShortId +
      '?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'

    let payload = {
      html,
      type: 'video',
      url: href
    }

    const cardSection = builder.createCardSection('embed', payload)
    addSection(cardSection)

    nodeFinished()
  }
  plugins.push(embedYouTubePlugin)

  const returnMobiledocForContent = ({ renderableContent, _id }) => {
    try {
      const mobileDoc = converter.toMobiledoc(renderableContent, {
        plugins
      })
      return JSON.stringify(mobileDoc)
    } catch (error) {
      if (process.env.LOG_AND_EXIT_EARLY === 'true') {
        console.log('Could not process:', _id)
        console.error(error)
        process.exit()
      }
      return ''
    }
  }

  articles.forEach(article => {
    const {
      _id,
      title,
      slugPart,
      createdDate,
      lastEditedDate,
      firstPublishedDate,
      featureImage,
      viewCount,
      shortId,
      author
    } = article

    const { username } = author
    const authorId = returnAuthorIdForUserName(username)

    const processedArticle = {
      id: _id,
      title,
      slug: slugPart,
      mobiledoc: returnMobiledocForContent(article),
      status: 'published',
      author_id: authorId,
      created_at: createdDate,
      created_by: authorId,
      updated_at: lastEditedDate,
      updated_by: authorId,
      published_at: firstPublishedDate,
      published_by: authorId,
      feature_image: featureImage.src,
      info: {
        viewCount: viewCount,
        shortId: shortId
      }
    }

    processedArticles.push(processedArticle)
  })

  const migration = {
    meta: { exported_on: 1546512759128, version: '2.9.1' },
    data: {
      posts: processedArticles
    }
  }

  fs.writeFileSync('data/migration.json', JSON.stringify(migration))
})
