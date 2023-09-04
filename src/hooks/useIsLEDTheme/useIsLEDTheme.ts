import { useRecoilValue } from 'recoil'
import { APP_THEME } from '../../models/Theme'
import themeState from '../../store/atoms/theme'

export const useIsLEDTheme = () => {
  const { theme } = useRecoilValue(themeState)
  return theme === APP_THEME.LED
}
