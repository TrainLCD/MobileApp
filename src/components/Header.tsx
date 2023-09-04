import React from 'react'
import { useRecoilValue } from 'recoil'
import { APP_THEME } from '../models/Theme'
import themeState from '../store/atoms/theme'
import HeaderJRWest from './HeaderJRWest'
import HeaderLED from './HeaderLED'
import HeaderSaikyo from './HeaderSaikyo'
import HeaderTY from './HeaderTY'
import HeaderTokyoMetro from './HeaderTokyoMetro'
import HeaderYamanote from './HeaderYamanote'

const Header = () => {
  const { theme } = useRecoilValue(themeState)

  switch (theme) {
    case APP_THEME.TOKYO_METRO:
    case APP_THEME.TOEI:
      return <HeaderTokyoMetro />
    case APP_THEME.JR_WEST:
      return <HeaderJRWest />
    case APP_THEME.YAMANOTE:
      return <HeaderYamanote />
    case APP_THEME.TY:
      return <HeaderTY />
    case APP_THEME.SAIKYO:
      return <HeaderSaikyo />
    case APP_THEME.LED:
      return <HeaderLED />
    default:
      return null
  }
}

export default React.memo(Header)
