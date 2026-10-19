
import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Item categories every post must pick from
  await db
    .insertInto('categories')
    .values([
      { name: 'Electronics' },
      { name: 'Keys' },
      { name: 'Wallets & IDs' },
      { name: 'Bags' },
      { name: 'Clothing' },
      { name: 'Water Bottles' },
      { name: 'Books & Notes' },
      { name: 'Jewelry & Accessories' },
      { name: 'Other' },
    ])
    .execute()

  // Official campus spots where finders can leave items
  await db
    .insertInto('drop_off_points')
    .values([
      {
        name: 'Library Front Desk',
        building: 'J. Murrey Atkins Library',
        latitude: 35.3058,
        longitude: -80.7323,
      },
      {
        name: 'Student Union Information Desk',
        building: 'Popp Martin Student Union',
        latitude: 35.3087,
        longitude: -80.7335,
      },
      {
        name: 'Campus Police Lost and Found',
        building: 'Police and Public Safety',
        latitude: 35.3074,
        longitude: -80.7280,
      },
    ])
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.deleteFrom('drop_off_points').execute()
  await db.deleteFrom('categories').execute()
}
