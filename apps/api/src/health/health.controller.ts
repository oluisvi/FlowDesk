import { Controller, Get } from '@nestjs/common';
import { HealthResponseSchema, type HealthResponse } from '@flowdesk/contracts';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return HealthResponseSchema.parse({ status: 'ok' });
  }
}
