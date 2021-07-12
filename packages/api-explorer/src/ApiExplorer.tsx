/*

 MIT License

 Copyright (c) 2021 Looker Data Sciences, Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.

 */

import React, {
  FC,
  useReducer,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { useLocation } from 'react-router'
import styled, { createGlobalStyle } from 'styled-components'
import { Aside, ComponentsProvider, Layout, Page } from '@looker/components'
import { Looker40SDK, Looker31SDK } from '@looker/sdk'
import { SpecList } from '@looker/sdk-codegen'

import {
  SearchContext,
  LodeContext,
  defaultLodeContextValue,
  EnvAdaptorContext,
} from './context'
import { EnvAdaptorConstants, getLoded, IApixEnvAdaptor } from './utils'
import { Header, SideNav } from './components'
import {
  specReducer,
  initDefaultSpecState,
  searchReducer,
  defaultSearchState,
} from './reducers'
import { AppRouter } from './routes'
import { apixFilesHost } from './utils/lodeUtils'
import { useActions } from './hooks'

export interface ApiExplorerProps {
  specs: SpecList
  sdk?: Looker31SDK | Looker40SDK
  exampleLodeUrl?: string
  declarationsLodeUrl?: string
  envAdaptor: IApixEnvAdaptor
  headless?: boolean
}

export const BodyOverride = createGlobalStyle` html { height: 100%; overflow: hidden; } `

const ApiExplorer: FC<ApiExplorerProps> = ({
  specs,
  envAdaptor,
  exampleLodeUrl = 'https://raw.githubusercontent.com/looker-open-source/sdk-codegen/main/examplesIndex.json',
  declarationsLodeUrl = `${apixFilesHost}/declarationsIndex.json`,
  headless = false,
}) => {
  const location = useLocation()
  const { setSdkLanguageAction } = useActions()

  const [spec, specDispatch] = useReducer(
    specReducer,
    initDefaultSpecState(specs, location)
  )
  const [searchSettings, setSearchSettings] = useReducer(
    searchReducer,
    defaultSearchState
  )

  const [lode, setLode] = useState(defaultLodeContextValue)

  const [hasNavigation, setHasNavigation] = useState(true)
  const toggleNavigation = (target?: boolean) =>
    setHasNavigation(target || !hasNavigation)

  const hasNavigationRef = useRef<boolean>(hasNavigation)
  const hasNavigationRefToggle = useCallback((e: MessageEvent<any>) => {
    if (e.origin === window.origin && e.data.action === 'toggle_sidebar') {
      // Use the current navigation value stored in the ref
      // (this function is called outside of the scope of a hook
      // so cannot see state).
      setHasNavigation(!hasNavigationRef.current)
    }
  }, [])
  useEffect(() => {
    if (headless) {
      window.addEventListener('message', hasNavigationRefToggle)
    }
    return () => {
      if (headless) {
        window.removeEventListener('message', hasNavigationRefToggle)
      }
    }
  }, [])
  useEffect(() => {
    // Store current toggle value in a ref so window message
    // listener knows what it is.
    hasNavigationRef.current = hasNavigation
  }, [hasNavigation])

  useEffect(() => {
    getLoded(exampleLodeUrl, declarationsLodeUrl).then((resp) => setLode(resp))
  }, [exampleLodeUrl, declarationsLodeUrl])

  useEffect(() => {
    const getSettings = async () => {
      const resp = await envAdaptor.localStorageGetItem(
        EnvAdaptorConstants.LOCALSTORAGE_SDK_LANGUAGE_KEY
      )
      if (resp) {
        setSdkLanguageAction(resp)
      }
    }
    getSettings()
  }, [envAdaptor, setSdkLanguageAction])

  const { loadGoogleFonts, themeCustomizations } = envAdaptor.themeOverrides()

  return (
    <>
      <ComponentsProvider
        loadGoogleFonts={loadGoogleFonts}
        themeCustomizations={themeCustomizations}
      >
        <EnvAdaptorContext.Provider value={{ envAdaptor }}>
          <LodeContext.Provider value={{ ...lode }}>
            <SearchContext.Provider
              value={{ searchSettings, setSearchSettings }}
            >
              <Page style={{ overflow: 'hidden' }}>
                {!headless && (
                  <Header
                    specs={specs}
                    spec={spec}
                    specDispatch={specDispatch}
                    toggleNavigation={toggleNavigation}
                  />
                )}
                <Layout hasAside height="100%">
                  {hasNavigation && (
                    <AsideBorder pt="large" width="20rem">
                      <SideNav
                        headless={headless}
                        specs={specs}
                        spec={spec}
                        specDispatch={specDispatch}
                      />
                    </AsideBorder>
                  )}
                  <AppRouter
                    api={spec.api}
                    specKey={spec.key}
                    specs={specs}
                    toggleNavigation={toggleNavigation}
                  />
                </Layout>
              </Page>
            </SearchContext.Provider>
          </LodeContext.Provider>
        </EnvAdaptorContext.Provider>
      </ComponentsProvider>
      {!headless && <BodyOverride />}
    </>
  )
}

/* Border support for `Aside` coming in @looker/components very soon */
export const AsideBorder = styled(Aside)`
  border-right: 1px solid ${({ theme }) => theme.colors.ui2};
`

export default ApiExplorer
