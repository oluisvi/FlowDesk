import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async findWorkspaceScoped<T>(
    findFirst: (where: {
      id: string;
      workspaceId: string;
    }) => Promise<T | null>,
    workspaceId: string,
    id: string,
  ): Promise<T | null> {
    return findFirst({ id, workspaceId });
  }
}
