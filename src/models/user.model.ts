import bcrypt from 'bcrypt';
import db from '../database';
import User from '../types/user.type';
import config from '../config';

const hashPassword = (password: string) => {
  const salt = parseInt(config.salt as string, 10);
  return bcrypt.hashSync(`${password}${config.pepper}`, salt);
};

class UserModel {
  // create
  async create(u: User): Promise<User> {
    try {
      // open connection with DB
      const connection = await db.connect();
      const sql = `INSERT INTO users (email, firstname, secondname, password)
      values ($1, $2, $3, $4) returning id, email, firstname, secondname`;
      // run query
      const result = await connection.query(sql, [
        u.email,
        u.firstname,
        u.secondname,
        hashPassword(u.password),
      ]);
      // release connection
      connection.release();
      // return created user
      return result.rows[0];
    } catch (error) {
      throw new Error(
        `Unable to create (${u.firstname}): ${(error as Error).message}`
      );
    }
  }
  // get all users
  async getMany(): Promise<User[]> {
    try {
      const connection = await db.connect();
      const sql = 'SELECT id, email, firstname, secondname from users';
      const result = await connection.query(sql);
      connection.release();
      return result.rows;
    } catch (error) {
      throw new Error(`Error at retrieving users ${(error as Error).message}`);
    }
  }
  // async FindOne(): Promise<User[]> {
  //   try {
  //     const connection = await db.connect();
  //     const sql = 'SELECT * from users WHERE id =$1';
  //     const result = await connection.query(sql);
  //     connection.release();
  //     return result.rows;
  //   } catch (error) {
  //     throw new Error(`Error at retrieving users ${(error as Error).message}`);
  //   }
  // }

  // get specific user
  async getOne(id: string): Promise<User> {
    try {
      const sql = `SELECT id, email, firstname, secondname FROM users 
      WHERE id=($1)`;

      const connection = await db.connect();

      const result = await connection.query(sql, [id]);

      connection.release();
      return result.rows[0];
    } catch (error) {
      throw new Error(`Could not find user ${id}, ${(error as Error).message}`);
    }
  }

  // update user
  async updateOne(u: User): Promise<User> {
    try {
      const connection = await db.connect();
      const sql = `UPDATE users 
                  SET email=$1, firstname=$2, secondname=$3, password=$4
                  WHERE id=$6 
                  RETURNING id, email, firstname, secondname`;

      const result = await connection.query(sql, [
        u.email,
        u.firstname,
        u.secondname,
        hashPassword(u.password),
        u.id,
      ]);
      connection.release();
      return result.rows[0];
    } catch (error) {
      throw new Error(
        `Could not update user: ${u.firstname}, ${(error as Error).message}`
      );
    }
  }

  // delete user
  async deleteOne(id: string): Promise<User> {
    try {
      const connection = await db.connect();
      const sql = `DELETE FROM users 
                  WHERE id=($1) 
                  RETURNING id, email, firstname, secondname`;

      const result = await connection.query(sql, [id]);

      connection.release();

      return result.rows[0];
    } catch (error) {
      throw new Error(
        `Could not delete user ${id}, ${(error as Error).message}`
      );
    }
  }

  // authenticate user
  async authenticate(email: string, password: string): Promise<User | null> {
    try {
      const connection = await db.connect();
      const sql = 'SELECT password FROM users WHERE email=$1';
      const result = await connection.query(sql, [email]);
      if (result.rows.length) {
        const { password: hashPassword } = result.rows[0];
        const isPasswordValid = bcrypt.compareSync(
          `${password}${config.pepper}`,
          hashPassword
        );
        if (isPasswordValid) {
          const userInfo = await connection.query(
            'SELECT id, email,  firstname, secondname FROM users WHERE email=($1)',
            [email]
          );
          return userInfo.rows[0];
        }
      }
      connection.release();
      return null;
    } catch (error) {
      throw new Error(`Unable to login: ${(error as Error).message}`);
    }
  }
}

export default UserModel;
