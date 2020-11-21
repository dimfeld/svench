// import addClasses from 'rehype-add-classes'
// import squeezeParagraphs from 'remark-squeeze-paragraphs'
import { mdsvex } from 'mdsvex'
import link from 'rehype-autolink-headings'
import slug from 'rehype-slug'
// import gemoji from 'remark-gemoji'
// import gemojiToEmoji from 'remark-gemoji-to-emoji'

const { preprocess } = require('svelte/compiler')

import addClasses from './rehype-add-classes'
import preprocessSvench from './preprocessor'

const noPreprocess = code => ({ code })

noPreprocess.getCached = noPreprocess

const maybeCustomExtension = (dft, x) => (typeof x === 'string' ? x : dft)

export default ({
  extensions,
  preprocessors = [],
  mdsvex: mdsvexEnabled,
  md: mdEnabled,
}) => {
  const cache = {}

  const extension = maybeCustomExtension('.svx', mdsvexEnabled)

  const rehypePlugins = [
    slug,
    [link, { behavior: 'append', properties: { className: 'svench-anchor' } }],
    [addClasses, { '*': 'svench-content svench-content-md' }],
  ]

  const svenchPreprocessors = [
    mdsvexEnabled &&
      mdsvex({
        extension,
        smartypants: false,
        // remarkPlugins: [gemojiToEmoji],
        rehypePlugins,
      }),

    mdEnabled &&
      mdsvex({
        extension: maybeCustomExtension('.md', mdEnabled),
        rehypePlugins,
      }),

    ...preprocessors,

    preprocessSvench({ extensions }),

    // trim first <p></p> that happens with mdsvex because of:
    //     <p><svench:options ... /></p>
    mdsvexEnabled && {
      markup({ content, filename }) {
        if (!filename.endsWith(extension)) return
        let code = content
        code = code.replace(/<p[^>]*><\/p>/, ' '.repeat('<p></p>'.length))
        return { code }
      },
    },
  ].filter(Boolean)

  const push = (...args) => {
    const [, { filename }] = args
    const result = preprocess(args.shift(), svenchPreprocessors, ...args)
    cache[filename] = result
    return result
  }

  const pull = async ({ content, filename }) => {
    const cached = cache[filename]
    if (cached) {
      delete cache[filename]
      return cached
    }
    return preprocess(content, preprocessors, { filename })
  }

  return { push, pull }
}
