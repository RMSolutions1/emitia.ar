import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes en orden correcto
  await prisma.paymentTransaction.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.apiConfiguration.deleteMany();
  await prisma.documentSequence.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const hashedPassword = await bcrypt.hash('johndoe123', 10);

  // ==========================================
  // CREAR SUPERADMIN (sin empresa)
  // ==========================================
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Administrador',
      email: 'superadmin@sistema.com',
      password: hashedPassword,
      role: 'superadmin',
      status: 'active',
    },
  });
  console.log('✅ SuperAdmin creado:', superAdmin.email);

  // ==========================================
  // CREAR EMPRESA DE DEMO
  // ==========================================
  const company = await prisma.company.create({
    data: {
      name: 'GRUPO EMPRENOR',
      legalName: 'GRUPO EMPRENOR S.A.',
      cuit: '30-12345678-9',
      iibb: '902-123456-7',
      condicionIva: 'responsable_inscripto',
      address: 'MAIPU 566',
      city: 'CABA',
      province: 'Buenos Aires',
      postalCode: '1006',
      phone: '+54 11 1234-5678',
      email: 'contacto@grupoemprenor.com',
      website: 'www.grupoemprenor.com',
      currency: 'ARS',
      taxRate: 21,
      invoicePrefix: 'FAC',
      nextInvoiceNum: 1,
      nextTicketNum: 1,
      defaultPOS: 1,
      plan: 'professional',
      maxUsers: 10,
      maxPOS: 5,
      status: 'active',
    },
  });
  console.log('✅ Empresa creada:', company.name);

  // ==========================================
  // CREAR USUARIOS DE LA EMPRESA
  // ==========================================
  
  // Admin de la empresa
  const companyAdmin = await prisma.user.create({
    data: {
      name: 'Admin Empresa',
      email: 'john@doe.com',
      password: hashedPassword,
      role: 'company_admin',
      companyId: company.id,
      status: 'active',
    },
  });
  console.log('✅ Admin de empresa creado:', companyAdmin.email);

  // Usuario normal de la empresa
  const regularUser = await prisma.user.create({
    data: {
      name: 'Vendedor Demo',
      email: 'vendedor@demo.com',
      password: hashedPassword,
      role: 'user',
      companyId: company.id,
      status: 'active',
    },
  });
  console.log('✅ Usuario vendedor creado:', regularUser.email);

  // Crear categorías para la empresa
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        companyId: company.id,
        name: 'Electrónica',
        description: 'Productos electrónicos y tecnología',
      },
    }),
    prisma.category.create({
      data: {
        companyId: company.id,
        name: 'Alimentos',
        description: 'Productos alimenticios y comestibles',
      },
    }),
    prisma.category.create({
      data: {
        companyId: company.id,
        name: 'Bebidas',
        description: 'Bebidas de todo tipo',
      },
    }),
    prisma.category.create({
      data: {
        companyId: company.id,
        name: 'Ropa',
        description: 'Ropa y accesorios',
      },
    }),
    prisma.category.create({
      data: {
        companyId: company.id,
        name: 'Hogar',
        description: 'Artículos para el hogar',
      },
    }),
  ]);
  console.log('✅ Categorías creadas:', categories.length);

  // Crear productos secuencialmente
  const products = [];
  
  // Electrónica
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Mouse Inalámbrico',
      description: 'Mouse inalámbrico ergonómico',
      sku: 'MOUSE-001',
      barcode: '7891234567890',
      price: 299.99,
      cost: 150.00,
      stock: 50,
      minStock: 10,
      categoryId: categories[0].id,
    },
  }));
  
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Teclado Mecánico',
      description: 'Teclado mecánico RGB',
      sku: 'KEYB-001',
      barcode: '7891234567891',
      price: 899.99,
      cost: 450.00,
      stock: 30,
      minStock: 10,
      categoryId: categories[0].id,
    },
  }));
  
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Auriculares Bluetooth',
      description: 'Auriculares inalámbricos con cancelación de ruido',
      sku: 'AUDIO-001',
      barcode: '7891234567892',
      price: 1299.99,
      cost: 650.00,
      stock: 8,
      minStock: 10,
      categoryId: categories[0].id,
    },
  }));
  
  // Alimentos
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Arroz Integral 1kg',
      description: 'Arroz integral orgánico',
      sku: 'FOOD-001',
      barcode: '7891234567893',
      price: 89.99,
      cost: 45.00,
      stock: 100,
      minStock: 20,
      categoryId: categories[1].id,
    },
  }));
  
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Aceite de Oliva 500ml',
      description: 'Aceite de oliva extra virgen',
      sku: 'FOOD-002',
      barcode: '7891234567894',
      price: 149.99,
      cost: 75.00,
      stock: 60,
      minStock: 15,
      categoryId: categories[1].id,
    },
  }));
  
  // Bebidas
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Agua Mineral 500ml',
      description: 'Agua mineral natural',
      sku: 'BEV-001',
      barcode: '7891234567895',
      price: 19.99,
      cost: 10.00,
      stock: 200,
      minStock: 50,
      categoryId: categories[2].id,
    },
  }));
  
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Jugo de Naranja 1L',
      description: 'Jugo de naranja natural',
      sku: 'BEV-002',
      barcode: '7891234567896',
      price: 59.99,
      cost: 30.00,
      stock: 5,
      minStock: 10,
      categoryId: categories[2].id,
    },
  }));
  
  // Ropa
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Camiseta Básica',
      description: 'Camiseta de algodón 100%',
      sku: 'CLOTH-001',
      barcode: '7891234567897',
      price: 199.99,
      cost: 100.00,
      stock: 80,
      minStock: 15,
      categoryId: categories[3].id,
    },
  }));
  
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Pantalón Jeans',
      description: 'Pantalón jeans clásico',
      sku: 'CLOTH-002',
      barcode: '7891234567898',
      price: 499.99,
      cost: 250.00,
      stock: 40,
      minStock: 10,
      categoryId: categories[3].id,
    },
  }));
  
  // Hogar
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Toalla de Baño',
      description: 'Toalla de algodón suave',
      sku: 'HOME-001',
      barcode: '7891234567899',
      price: 149.99,
      cost: 75.00,
      stock: 70,
      minStock: 20,
      categoryId: categories[4].id,
    },
  }));
  
  products.push(await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Juego de Sábanas',
      description: 'Juego de sábanas 2 plazas',
      sku: 'HOME-002',
      barcode: '7891234568000',
      price: 799.99,
      cost: 400.00,
      stock: 25,
      minStock: 10,
      categoryId: categories[4].id,
    },
  }));
  
  console.log('✅ Productos creados:', products.length);

  // Crear clientes secuencialmente
  const customers = [];
  
  customers.push(await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'María González',
      email: 'maria.gonzalez@email.com',
      phone: '+54 11 4567-8901',
      document: '12345678',
      address: 'Av. Corrientes 1234, CABA',
    },
  }));
  
  customers.push(await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Carlos Rodríguez',
      email: 'carlos.rodriguez@email.com',
      phone: '+54 11 4567-8902',
      document: '23456789',
      address: 'Av. Santa Fe 5678, CABA',
    },
  }));
  
  customers.push(await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Ana Martínez',
      email: 'ana.martinez@email.com',
      phone: '+54 11 4567-8903',
      document: '34567890',
      address: 'Av. Cabildo 9012, CABA',
    },
  }));
  
  customers.push(await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Juan Pérez',
      email: 'juan.perez@email.com',
      phone: '+54 11 4567-8904',
      document: '45678901',
      address: 'Av. Rivadavia 3456, CABA',
    },
  }));
  
  customers.push(await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Laura Fernández',
      email: 'laura.fernandez@email.com',
      phone: '+54 11 4567-8905',
      document: '56789012',
      address: 'Av. Belgrano 7890, CABA',
    },
  }));
  
  console.log('✅ Clientes creados:', customers.length);

  // Crear una venta de ejemplo
  const sale = await prisma.sale.create({
    data: {
      companyId: company.id,
      saleNumber: 'V-00001',
      customerId: customers[0].id,
      userId: companyAdmin.id,
      subtotal: 1389.97,
      tax: 0,
      discount: 0,
      total: 1389.97,
      paymentMethod: 'Efectivo',
      cashReceived: 1500.00,
      change: 110.03,
      status: 'completed',
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 2,
            unitPrice: 299.99,
            subtotal: 599.98,
          },
          {
            productId: products[5].id,
            quantity: 10,
            unitPrice: 19.99,
            subtotal: 199.90,
          },
          {
            productId: products[9].id,
            quantity: 3,
            unitPrice: 149.99,
            subtotal: 449.97,
          },
          {
            productId: products[3].id,
            quantity: 1,
            unitPrice: 89.99,
            subtotal: 89.99,
          },
          {
            productId: products[6].id,
            quantity: 1,
            unitPrice: 59.99,
            subtotal: 59.99,
          },
        ],
      },
    },
  });
  console.log('✅ Venta de ejemplo creada:', sale.saleNumber);

  // Actualizar stock de productos vendidos
  await prisma.product.update({
    where: { id: products[0].id },
    data: { stock: 48 },
  });
  await prisma.product.update({
    where: { id: products[5].id },
    data: { stock: 190 },
  });
  await prisma.product.update({
    where: { id: products[9].id },
    data: { stock: 67 },
  });
  await prisma.product.update({
    where: { id: products[3].id },
    data: { stock: 99 },
  });
  await prisma.product.update({
    where: { id: products[6].id },
    data: { stock: 4 },
  });

  // Crear proveedores
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        companyId: company.id,
        name: 'Distribuidora Tech Argentina',
        contactName: 'Carlos Rodriguez',
        email: 'ventas@techarg.com',
        phone: '+54 11 4567-8901',
        address: 'Av. Corrientes 1234, CABA',
        cuit: '30-71234567-9',
        notes: 'Proveedor principal de electrónica',
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: company.id,
        name: 'Alimentos del Sur SRL',
        contactName: 'María García',
        email: 'compras@alimentosdelsur.com.ar',
        phone: '+54 11 5678-1234',
        address: 'Parque Industrial, Quilmes',
        cuit: '30-65432198-7',
        notes: 'Productos alimenticios mayoristas',
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: company.id,
        name: 'Bebidas Premium SA',
        contactName: 'Juan Martínez',
        email: 'pedidos@bebidaspremium.com',
        phone: '+54 11 4321-8765',
        address: 'Zona Norte, San Isidro',
        cuit: '30-78901234-5',
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: company.id,
        name: 'Importadora Global',
        contactName: 'Ana López',
        email: 'info@importadoraglobal.com',
        phone: '+54 11 6789-0123',
        address: 'Puerto Madero, CABA',
        cuit: '30-45678901-2',
        notes: 'Importación de productos varios',
      },
    }),
  ]);
  console.log('✅ Proveedores creados:', suppliers.length);

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📌 Credenciales de acceso:');
  console.log('   SuperAdmin: superadmin@sistema.com / johndoe123');
  console.log('   Admin Empresa: john@doe.com / johndoe123');
  console.log('   Vendedor: vendedor@demo.com / johndoe123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
