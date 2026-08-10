export interface IPaginationDataResponse {
  page: number
  size: number
  total_data: number
  page_count: number
}

export interface BaseResponse<T> {
  success: boolean
  message: string
  response_data?: T
  errors?: unknown
  paginated_data?: IPaginationDataResponse
}
