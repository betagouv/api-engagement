import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { UserModel } from '../user';
import { User } from '../../../types';
import { setupMongoDBForTesting } from './helpers/mongodb';

describe('User Model', () => {
  setupMongoDBForTesting([UserModel]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create & save user successfully', async () => {
    const userData: Partial<User> = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      publishers: ['publisher123'],
      role: 'user',
    };
    
    const validUser = new UserModel(userData);
    const savedUser = await validUser.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.firstname).toBe(userData.firstname);
    expect(savedUser.lastname).toBe(userData.lastname);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.publishers).toEqual(userData.publishers);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.deleted).toBe(false); // Default value
    
    // Timestamps should be defined
    expect(savedUser.created_at).toBeDefined();
    expect(savedUser.updated_at).toBeDefined();
  });

  it('should fail when required field is missing', async () => {
    const userWithoutRequiredField = new UserModel({
      lastname: 'Doe',
      email: 'missing.firstname@example.com',
      publishers: ['publisher123'],
      // Missing firstname which is required
    });
    
    await expect(userWithoutRequiredField.save()).rejects.toThrow();
  });

  it('should hash password during pre-save hook', async () => {
    const user = new UserModel({
      firstname: 'Jane',
      lastname: 'Smith',
      email: 'jane.smith@example.com',
      password: 'securepassword',
      publishers: ['publisher456'],
    });

    await user.save();
    
    // Verify the password was hashed (not equal to original)
    expect(user.password).not.toBe('securepassword');
    
    // Verify it's a valid bcrypt hash
    expect(user.password).toMatch(/^\$2[aby]\$\d+\$/);
  });

  it('should not hash password if not modified', async () => {
    // First save to hash the password
    const user = new UserModel({
      firstname: 'Alex',
      lastname: 'Johnson',
      email: 'alex.johnson@example.com',
      password: 'initialpassword',
      publishers: ['publisher789'],
    });
    await user.save();
    
    // Store the hashed password
    const hashedPassword = user.password;
    
    // Update a field other than password
    user.lastname = 'Updated';
    await user.save();
    
    // Verify password hasn't changed
    expect(user.password).toBe(hashedPassword);
  });

  it('should correctly compare passwords', async () => {
    const user = new UserModel({
      firstname: 'Test',
      lastname: 'User',
      email: 'test.user@example.com',
      password: 'testpassword',
      publishers: ['publisher123'],
    });
    await user.save();
    
    // Test comparePassword method with correct password
    const correctResult = await user.comparePassword!('testpassword');
    expect(correctResult).toBe(true);
    
    // Test comparePassword method with incorrect password
    const incorrectResult = await user.comparePassword!('wrongpassword');
    expect(incorrectResult).toBe(false);
  });

  it('should handle null password in comparePassword method', async () => {
    const user = new UserModel({
      firstname: 'No',
      lastname: 'Password',
      email: 'no.password@example.com',
      publishers: ['publisher123'],
      // No password provided
    });
    await user.save();
    
    // Test comparePassword with null password
    const result = await user.comparePassword!('anypassword');
    expect(result).toBe(false);
  });

  it('should update timestamps on save', async () => {
    const user = new UserModel({
      firstname: 'Time',
      lastname: 'Stamp',
      email: 'time.stamp@example.com',
      publishers: ['publisher123'],
    });
    
    const savedUser = await user.save();
    const initialUpdatedAt = savedUser.updated_at;
    
    // Wait a bit to ensure timestamp would change
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Update user
    savedUser.lastname = 'UpdatedStamp';
    await savedUser.save();
    
    // Verify updated_at timestamp has changed
    expect(savedUser.updated_at).not.toEqual(initialUpdatedAt);
  });
});
