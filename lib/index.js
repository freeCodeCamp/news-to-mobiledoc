"use strict";

var _fs = _interopRequireDefault(require("fs"));

var _htmlToMobiledoc = _interopRequireDefault(require("@tryghost/html-to-mobiledoc"));

var _kgParserPlugins = _interopRequireDefault(require("@tryghost/kg-parser-plugins"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('dotenv').config();

var articles;
var processedArticles = [];

_fs.default.readFile('data/freecodecamp.article.json', 'utf8', function (err, data) {
  if (err) throw err;
  articles = JSON.parse(data);

  var returnAuthorIdForUserName = function returnAuthorIdForUserName(username) {
    switch (username) {
      case 'quincylarson':
        return '5c0e8aa92dd08205fc25e342';

      case 'beaucarnes':
        return '5c0e8a912dd08205fc25e33f';

      case 'abbeyrenn':
        return '5c0e8a4b2dd08205fc25e33c';

      default:
        return '1';
      // set by default to freeCodeCamp.org owner account
    }
  };

  var isPodcastiframeRegex = /^<iframe style=/;

  var embedPodcastPlugin = function embedPodcastPlugin(node, builder, _ref) {
    var addSection = _ref.addSection,
        nodeFinished = _ref.nodeFinished;
    var nodeType = node.nodeType,
        tagName = node.tagName,
        outerHTML = node.outerHTML;

    if (nodeType !== 1 || tagName !== 'IFRAME' || true !== (outerHTML && isPodcastiframeRegex.test(outerHTML))) {
      return;
    }

    var payload = {
      html: outerHTML
    };
    var cardSection = builder.createCardSection('embed', payload);
    addSection(cardSection);
    nodeFinished();
  };

  _kgParserPlugins.default.push(embedPodcastPlugin);

  var isYouTubeStringRegex = /\s(the freeCodeCamp.org YouTube channel)\s/;
  var isYouTubeIdRegex = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;

  var embedYouTubePlugin = function embedYouTubePlugin(node, builder, _ref2) {
    var addSection = _ref2.addSection,
        nodeFinished = _ref2.nodeFinished;
    var nodeType = node.nodeType,
        tagName = node.tagName,
        textContent = node.textContent;

    if (nodeType !== 1 || tagName !== 'P' || true !== (textContent && isYouTubeStringRegex.test(textContent))) {
      return;
    }

    var href = node.firstElementChild.href;
    var anchorMarkup = builder.createMarkup('a', {
      href: href
    });
    var prevNodeMarker = builder.createMarker(node.firstChild.textContent);
    var thisNodeMarker = builder.createMarker('the freeCodeCamp.org YouTube channel', [anchorMarkup]);
    var nextNodeMarker = builder.createMarker(node.lastChild.textContent);
    var markupSection = builder.createMarkupSection('p', [prevNodeMarker, thisNodeMarker, nextNodeMarker]);
    addSection(markupSection);
    var urlShortId = href.match(isYouTubeIdRegex)[1];
    var html = '<iframe width="480" height="270" src="' + 'https://www.youtube.com/embed/' + urlShortId + '?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
    var payload = {
      html: html,
      type: 'video',
      url: href
    };
    var cardSection = builder.createCardSection('embed', payload);
    addSection(cardSection);
    nodeFinished();
  };

  _kgParserPlugins.default.push(embedYouTubePlugin);

  var returnMobiledocForContent = function returnMobiledocForContent(_ref3) {
    var renderableContent = _ref3.renderableContent,
        _id = _ref3._id;

    try {
      var mobileDoc = _htmlToMobiledoc.default.toMobiledoc(renderableContent, {
        plugins: _kgParserPlugins.default
      });

      return JSON.stringify(mobileDoc);
    } catch (error) {
      if (process.env.LOG_AND_EXIT_EARLY === 'true') {
        console.log('Could not process:', _id);
        console.error(error);
        process.exit();
      }

      return '';
    }
  };

  articles.forEach(function (article) {
    var _id = article._id,
        title = article.title,
        slugPart = article.slugPart,
        createdDate = article.createdDate,
        lastEditedDate = article.lastEditedDate,
        firstPublishedDate = article.firstPublishedDate,
        featureImage = article.featureImage,
        viewCount = article.viewCount,
        shortId = article.shortId,
        author = article.author;
    var username = author.username;
    var authorId = returnAuthorIdForUserName(username);
    var processedArticle = {
      id: _id,
      title: title,
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
    };
    processedArticles.push(processedArticle);
  });
  var migration = {
    meta: {
      exported_on: 1546512759128,
      version: '2.9.1'
    },
    data: {
      posts: processedArticles
    }
  };

  _fs.default.writeFileSync('data/migration.json', JSON.stringify(migration));
});