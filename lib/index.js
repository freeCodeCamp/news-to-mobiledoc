"use strict";

var _fs = _interopRequireDefault(require("fs"));

var _htmlToMobiledoc = _interopRequireDefault(require("@tryghost/html-to-mobiledoc"));

var _kgParserPlugins = _interopRequireDefault(require("@tryghost/kg-parser-plugins"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

  var embedYouTubePlugin = function embedYouTubePlugin(_ref, builder, _ref2) {
    /*
    if (nodeType !== 1 || tagName !== "A") {
      return;
    }
     const cardSection = builder.createCardSection("image", payload);
    addSection(cardSection);
    nodeFinished();
    */

    var nodeType = _ref.nodeType,
        tagName = _ref.tagName;
    var addSection = _ref2.addSection,
        nodeFinished = _ref2.nodeFinished;
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
      console.log('Could not process:', _id);
      console.error(error);
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