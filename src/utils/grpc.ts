import { API_URL } from 'react-native-dotenv'
import { StationAPIClient } from '../gen/StationapiServiceClientPb'

const grpcClient = new StationAPIClient(API_URL)

export default grpcClient
