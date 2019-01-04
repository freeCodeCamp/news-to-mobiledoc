import fs from 'fs'
import converter from '@tryghost/html-to-mobiledoc'
import plugins from '@tryghost/kg-parser-plugins'

let articles
const processedArticles = []

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

  const embedYouTubePlugin = (
    { nodeType, tagName },
    builder,
    { addSection, nodeFinished }
  ) => {
    /*
    if (nodeType !== 1 || tagName !== "A") {
      return;
    }

    const cardSection = builder.createCardSection("image", payload);
    addSection(cardSection);
    nodeFinished();
    */
  }
  plugins.push(embedYouTubePlugin)

  const returnMobiledocForContent = ({ renderableContent, _id }) => {
    try {
      const mobileDoc = converter.toMobiledoc(renderableContent, {
        plugins
      })
      return JSON.stringify(mobileDoc)
    } catch (error) {
      console.log('Could not process:', _id)
      console.error(error)
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
