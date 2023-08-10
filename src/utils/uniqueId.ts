import { UNIQUE_ID_STRENGTH } from '../constants'

const getUniqueId = () => {
  return (
    new Date().getTime().toString(16) +
    Math.floor(UNIQUE_ID_STRENGTH * Math.random()).toString(16)
  )
}

export default getUniqueId
