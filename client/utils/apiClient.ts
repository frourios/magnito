import aspida from '@aspida/axios';
import api from 'api/$api';
import axios from 'axios';
import { NEXT_PUBLIC_API_ORIGIN } from './clientEnvs';

export const apiAxios = axios.create({ withCredentials: true });

export const apiClient = api(
  aspida(apiAxios, {
    baseURL:
      typeof location !== 'undefined' && location.protocol === 'https:'
        ? undefined
        : NEXT_PUBLIC_API_ORIGIN,
  }),
);
