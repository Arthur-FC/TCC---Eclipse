import 'reflect-metadata';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from './typeorm-options';

const configService = new ConfigService(process.env);

export default new DataSource(createDataSourceOptions(configService));
