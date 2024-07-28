import { TYPE_CHANGE_HIDE_THEMES } from '../constants'
import { useStore } from './useStore'

const useShouldHideTypeChange = (): boolean => {
  const theme = useStore((state) => state.theme)
  return TYPE_CHANGE_HIDE_THEMES.includes(theme)
}

export default useShouldHideTypeChange
