import prisma from '@/lib/prisma';
import styles from './AdminCategories.module.css';

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          children: true
        }
      }
    }
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Category Management</h1>
          <p className={styles.subtitle}>Organize and manage your platform hierarchy.</p>
        </div>
        <button className="btn btn-primary">+ Add Root Category</button>
      </header>

      <div className={styles.content}>
        <div className={styles.categoryTree}>
          {categories.map((cat) => (
            <div key={cat.id} className={styles.rootCategory}>
              <div className={styles.categoryRow}>
                <div className={styles.nodeInfo}>
                  <span className={styles.icon}>{cat.icon || '📁'}</span>
                  <span className={styles.name}>{cat.name}</span>
                  <span className={styles.slug}>/{cat.slug}</span>
                </div>
                <div className={styles.actions}>
                  <button className={styles.actionBtn}>Edit</button>
                  <button className={styles.actionBtn}>Add Sub</button>
                </div>
              </div>

              {cat.children && cat.children.length > 0 && (
                <div className={styles.subCategories}>
                  {cat.children.map((sub) => (
                    <div key={sub.id} className={styles.subCategory}>
                      <div className={styles.categoryRow}>
                        <div className={styles.nodeInfo}>
                          <span className={styles.name}>{sub.name}</span>
                          <span className={styles.slug}>/{sub.slug}</span>
                        </div>
                        <div className={styles.actions}>
                          <button className={styles.actionBtn}>Edit</button>
                          <button className={styles.actionBtn}>Add Niche</button>
                        </div>
                      </div>

                      {sub.children && sub.children.length > 0 && (
                        <div className={styles.leafCategories}>
                          {sub.children.map((leaf) => (
                            <div key={leaf.id} className={styles.categoryRow}>
                              <div className={styles.nodeInfo}>
                                <span className={styles.name}>{leaf.name}</span>
                                <span className={styles.slug}>/{leaf.slug}</span>
                              </div>
                              <div className={styles.actions}>
                                <button className={styles.actionBtn}>Edit</button>
                                <button className={styles.deleteBtn}>Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
