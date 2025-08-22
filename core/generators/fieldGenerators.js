/**
 * Field generators module
 * Functions for generating individual field values based on field types and options
 */

const { faker } = require('@faker-js/faker');
const _ = require('lodash');

/**
 * Field generator functions map
 * Maps field types to their respective generator functions
 */
const fieldGenerators = {
  // Basic types
  string: (options = {}) => {
    const { min = 5, max = 10, format } = options;
    
    switch (format) {
      case 'email':
        return faker.internet.email();
      case 'url':
        return faker.internet.url();
      case 'uuid':
        return faker.string.uuid();
      case 'phone':
        return faker.phone.number();
      case 'date':
        return faker.date.past().toISOString().split('T')[0];
      case 'datetime':
        return faker.date.past().toISOString();
      case 'name':
        return faker.person.fullName();
      case 'firstName':
        return faker.person.firstName();
      case 'lastName':
        return faker.person.lastName();
      case 'sentence':
        return faker.lorem.sentence();
      case 'paragraph':
        return faker.lorem.paragraph();
      default:
        return faker.string.alpha({ length: { min, max } });
    }
  },

  number: (options = {}) => {
    const { min = 0, max = 1000, precision = 0 } = options;
    return Number(faker.number.float({ min, max, precision }));
  },

  integer: (options = {}) => {
    const { min = 0, max = 1000 } = options;
    return faker.number.int({ min, max });
  },

  boolean: () => faker.datatype.boolean(),

  // Complex types
  array: (options = {}) => {
    const { items = {}, minItems = 1, maxItems = 5 } = options;
    const count = faker.number.int({ min: minItems, max: maxItems });
    
    return Array.from({ length: count }).map(() => {
      return generateFieldValue(items.type || 'string', items);
    });
  },

  object: (options = {}) => {
    const { properties = {} } = options;
    const result = {};
    
    Object.entries(properties).forEach(([key, fieldDef]) => {
      result[key] = generateFieldValue(fieldDef.type, fieldDef);
    });
    
    return result;
  },

  // Domain specific types
  address: (options = {}) => {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
      zipCode: faker.location.zipCode()
    };
  },

  person: (options = {}) => {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.number()
    };
  },

  company: () => {
    return {
      name: faker.company.name(),
      catchPhrase: faker.company.catchPhrase(),
      industry: faker.company.buzzNoun()
    };
  },
  
  product: () => {
    return {
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: faker.commerce.price(),
      category: faker.commerce.department()
    };
  },
  
  transaction: () => {
    return {
      id: faker.string.uuid(),
      amount: Number(faker.finance.amount()),
      date: faker.date.recent().toISOString(),
      currency: faker.finance.currencyCode(),
      description: faker.finance.transactionDescription()
    };
  },
  
  // References and enums
  enum: (options = {}) => {
    const { values = [] } = options;
    return faker.helpers.arrayElement(values);
  },

  reference: (options = {}) => {
    // Placeholder for reference handling
    // In a real implementation, this would reference other generated data
    return options.defaultValue || faker.string.uuid();
  }
};

/**
 * Generate a single field value based on field type and options
 * @param {string} fieldType - The type of field to generate
 * @param {object} options - Options for field generation
 * @returns {*} Generated field value
 */
function generateFieldValue(fieldType = 'string', options = {}) {
  const generator = fieldGenerators[fieldType] || fieldGenerators.string;
  return generator(options);
}

module.exports = {
  ...fieldGenerators,
  generateFieldValue
};
