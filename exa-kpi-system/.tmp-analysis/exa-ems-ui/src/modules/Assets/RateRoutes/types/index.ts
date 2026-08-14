export interface RateRoute {
  route_id?: number | string
  route?: string
  name?: string
  city_a?: { city_id?: number; code?: string; name?: string }
  city_b?: { city_id?: number; code?: string; name?: string }
  city_a_id?: number | string
  city_b_id?: number | string
  rate_routes?: Array<{
    rate_builder: { id: number; name?: string }
    km?: string | number
    price?: string | number
    fuel?: string | number
    fuelgenset?: string | number
  }>
  [key: string]: any
}

export interface RateRouteState {
  list: RateRoute[]
  currentRateRoute: RateRoute | null
  loading: boolean
  error: string | null
}
