import React from 'react'
import { useRecoilValue } from 'recoil'
import { useStore } from '../hooks/useStore'
import { APP_THEME } from '../models/Theme'
import { currentStationSelector } from '../store/selectors/currentStation'
import HeaderE235 from './HeaderE235'
import HeaderJRWest from './HeaderJRWest'
import HeaderLED from './HeaderLED'
import HeaderSaikyo from './HeaderSaikyo'
import HeaderTY from './HeaderTY'
import HeaderTokyoMetro from './HeaderTokyoMetro'

const Header = () => {
  const theme = useStore((state) => state.theme)
  const station = useRecoilValue(currentStationSelector({}))

  if (!station) {
    return null
  }

  switch (theme) {
    case APP_THEME.TOKYO_METRO:
    case APP_THEME.TOEI:
      return <HeaderTokyoMetro />
    case APP_THEME.JR_WEST:
      return <HeaderJRWest />
    case APP_THEME.YAMANOTE:
    case APP_THEME.JO:
      return <HeaderE235 isJO={theme === APP_THEME.JO} />
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
