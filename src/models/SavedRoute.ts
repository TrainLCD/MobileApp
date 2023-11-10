import { StopCondition, TrainType } from '../gen/stationapi_pb'

type SavedRouteStation = {
  id: number
  stopCondition: StopCondition
}

export type SavedRoute = {
  id: string
  userId: number
  name: string
  stations: SavedRouteStation[]
  createdAt: Date
  trainType: TrainType.AsObject
}
