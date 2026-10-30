import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class CreateUserAndAddOwnerIdToTodo1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create users table
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) {
      await queryRunner.createTable(
        new Table({
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'serial',
              isPrimary: true,
            },
            {
              name: 'email',
              type: 'varchar',
              isUnique: true,
            },
            {
              name: 'password',
              type: 'varchar',
            },
            {
              name: 'name',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'role',
              type: 'varchar',
              default: "'user'",
            },
            {
              name: 'hashedRefreshToken',
              type: 'varchar',
              isNullable: true,
            },
          ],
        }),
        true,
      );
    }

    // 2. Add ownerId to todo table if it exists
    const hasTodoTable = await queryRunner.hasTable('todo');
    if (hasTodoTable) {
      const hasColumn = await queryRunner.hasColumn('todo', 'ownerId');
      if (!hasColumn) {
        await queryRunner.addColumn(
          'todo',
          new TableColumn({
            name: 'ownerId',
            type: 'integer',
            isNullable: true,
          }),
        );
      }

      await queryRunner.createForeignKey(
        'todo',
        new TableForeignKey({
          columnNames: ['ownerId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTodoTable = await queryRunner.hasTable('todo');
    if (hasTodoTable) {
      const table = await queryRunner.getTable('todo');
      const foreignKey = table?.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('ownerId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('todo', foreignKey);
      }
      if (await queryRunner.hasColumn('todo', 'ownerId')) {
        await queryRunner.dropColumn('todo', 'ownerId');
      }
    }
    if (await queryRunner.hasTable('users')) {
      await queryRunner.dropTable('users', true);
    }
  }
}
