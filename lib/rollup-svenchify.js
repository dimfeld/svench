import * as path from 'path'
import { defaults } from './config'
import { pipe } from './util'

const SVENCH = Symbol('Svench')

const PROXYQUIRE_MODULE = './lib/rollup-svenchify.proxyquire.js'
const REQUIRE_MODULE = './lib/rollup-svenchify.require.js'

const defaultSvelteExtensions = ['.svelte']

const svenchPluginDefaults = {
  enabled: true,

  index: true,

  serve: true,
}

const mergeExtensions = (...sources) => [
  ...new Set(
    sources
      .flat()
      .filter(Boolean)
      .map(x => path.extname(x) || x)
  ),
]

const mergePreprocess = (...sources) => sources.flat().filter(Boolean)

export default SvenchPlugin => {
  process.env.SVENCH = process.env.SVENCH || 1

  const _svenchify = async (source, svenchifyConfig = {}) => {
    const {
      noMagic = false,
      interceptSveltePlugin = !noMagic,
      esm = !noMagic,
      svelte = {},
      ...svenchConfig
    } = svenchifyConfig

    const { extensions = defaults.extensions } = svenchConfig

    const importConfig = wrapSvelteConfig => async source => {
      if (typeof source === 'string') {
        const file = path.resolve(source)
        if (interceptSveltePlugin) {
          if (esm) {
            const _require = require('esm')(module)
            const loadConfigFile = _require(PROXYQUIRE_MODULE)
            return loadConfigFile(wrapSvelteConfig, file).default
          } else {
            const loadConfigFile = require(PROXYQUIRE_MODULE)
            return loadConfigFile(wrapSvelteConfig, file)
          }
        } else {
          if (esm) {
            const _require = require('esm')(module)
            // NOTE this should be the following, but esm fails to rewrite some
            // imports (`import { svenchify } from 'svench/rollup'`, especially)
            //     return require(file).default
            const requireFile = _require(REQUIRE_MODULE)
            return requireFile(file).default
          } else {
            return require(file)
          }
        }
      }
      return source
    }

    return async (...args) => {
      let preprocess

      const wrapSvelteConfig = config => {
        preprocess = mergePreprocess(config.preprocess, svelte.preprocess)
        return {
          ...config,
          extensions: mergeExtensions(
            config.extensions || defaultSvelteExtensions,
            svelte.extensions || extensions
          ),
          preprocess: {
            markup: (...args) => $.preprocess(...args),
          },
        }
      }

      const castConfig = async source => {
        const resolved = await source
        if (typeof resolved === 'function') {
          return castConfig(resolved(...args))
        }
        return resolved
      }

      const loadConfig = pipe(importConfig(wrapSvelteConfig), castConfig)

      const config = await loadConfig(source)

      if (!config.plugins) {
        throw new Error('A Svelte plugin is required in your Rollup config')
      }

      config.plugins = config.plugins.filter(Boolean).map(x => {
        if (!x[SVENCH]) return x
        const {
          [SVENCH]: { plugin, config },
        } = x
        return plugin(wrapSvelteConfig(config))
      })

      const { $, ...svenchPlugin } = SvenchPlugin({
        ...svenchPluginDefaults,
        preprocess,
        ...svenchConfig,
      })

      config.plugins.unshift(svenchPlugin)

      return config
    }
  }

  _svenchify.svelte = (plugin, config) => {
    // avoid double wrapping
    if (plugin._IS_SVENCH_WRAPPED) return plugin(config)
    // try to avoid creating an useless instance (to avoid double warnings)
    // NOTE check process.env.SVENCH just in time
    const hooks = process.env.SVENCH ? {} : plugin(config)
    hooks[SVENCH] = { plugin, config }
    return hooks
  }

  return _svenchify
}