import type { ApiClient, ApiResult, RequestOptions } from './ApiClient';

/** Generic CRUD client: `new ResourceApi<User>(api, ENDPOINTS.users)`. */
export class ResourceApi<T = unknown> {
  constructor(
    private readonly api: ApiClient,
    private readonly resource: string,
  ) {}

  list = (params?: RequestOptions['params'], o?: RequestOptions): Promise<ApiResult> =>
    this.api.get(this.resource, { ...o, params });
  get = (id: string | number, o?: RequestOptions): Promise<ApiResult<T>> =>
    this.api.get<T>(`${this.resource}/${id}`, o);
  create = (data: Partial<T>, o?: RequestOptions): Promise<ApiResult<T>> =>
    this.api.post<T>(this.resource, data, o);
  update = (id: string | number, data: Partial<T>, o?: RequestOptions): Promise<ApiResult<T>> =>
    this.api.put<T>(`${this.resource}/${id}`, data, o);
  patch = (id: string | number, data: Partial<T>, o?: RequestOptions): Promise<ApiResult<T>> =>
    this.api.patch<T>(`${this.resource}/${id}`, data, o);
  remove = (id: string | number, o?: RequestOptions): Promise<ApiResult> =>
    this.api.delete(`${this.resource}/${id}`, o);
}
