import { NextApiRequest, NextApiResponse } from 'next';

// Available locations
const LOCATIONS = ['MCAC', 'Ramsey Creek Beach', 'Double Oaks', 'Cordelia'];

// Mock data for development
let employees = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    position: 'Software Engineer',
    hireDate: '2023-01-15',
    isActive: true,
    archivedAt: null,
    locations: ['MCAC', 'Ramsey Creek Beach'],
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    position: 'HR Manager',
    hireDate: '2022-06-01',
    isActive: true,
    archivedAt: null,
    locations: ['Double Oaks'],
  },
];

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        // In production, this would be a database query
        const employees = await prisma.employee.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            name: 'asc',
          },
        });
        res.status(200).json(employees);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
      }
      break;

    case 'POST':
      try {
        const { name, email, position, hireDate, locations } = req.body;

        // Validate required fields
        if (!name || !email || !position || !hireDate) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check for duplicate email
        if (employees.some(emp => emp.email === email)) {
          return res.status(400).json({ error: 'Email already exists' });
        }

        // Validate locations
        if (!Array.isArray(locations) || locations.length === 0) {
          return res.status(400).json({ error: 'At least one location must be selected' });
        }

        // Validate each location
        const invalidLocations = locations.filter(loc => !LOCATIONS.includes(loc));
        if (invalidLocations.length > 0) {
          return res.status(400).json({ 
            error: `Invalid locations: ${invalidLocations.join(', ')}. Valid locations are: ${LOCATIONS.join(', ')}` 
          });
        }

        // Create new employee
        const newEmployee = {
          id: String(employees.length + 1),
          name,
          email,
          position,
          hireDate,
          isActive: true,
          archivedAt: null,
          locations,
        };

        // In production, this would be a database insert
        const employee = await prisma.employee.create({
          data: newEmployee,
        });
        employees.push(newEmployee);

        res.status(201).json(newEmployee);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create employee' });
      }
      break;

    case 'PUT':
      try {
        const { id, name, email, position, hireDate, isActive, locations, archivedAt } = req.body;

        // Validate required fields
        if (!id) {
          return res.status(400).json({ error: 'Employee ID is required' });
        }

        // Find employee
        const employeeIndex = employees.findIndex(emp => emp.id === id);
        if (employeeIndex === -1) {
          return res.status(404).json({ error: 'Employee not found' });
        }

        // Validate locations if provided
        if (locations) {
          if (!Array.isArray(locations) || locations.length === 0) {
            return res.status(400).json({ error: 'At least one location must be selected' });
          }

          const invalidLocations = locations.filter(loc => !LOCATIONS.includes(loc));
          if (invalidLocations.length > 0) {
            return res.status(400).json({ 
              error: `Invalid locations: ${invalidLocations.join(', ')}. Valid locations are: ${LOCATIONS.join(', ')}` 
            });
          }
        }

        // Update employee
        const updatedEmployee = {
          ...employees[employeeIndex],
          name: name || employees[employeeIndex].name,
          email: email || employees[employeeIndex].email,
          position: position || employees[employeeIndex].position,
          hireDate: hireDate || employees[employeeIndex].hireDate,
          isActive: isActive !== undefined ? isActive : employees[employeeIndex].isActive,
          archivedAt: isActive === false ? new Date().toISOString() : employees[employeeIndex].archivedAt,
          locations: locations || employees[employeeIndex].locations,
        };

        // In production, this would be a database update
        const employee = await prisma.employee.update({
          where: { id },
          data: updatedEmployee,
        });
        employees[employeeIndex] = updatedEmployee;

        res.status(200).json(updatedEmployee);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update employee' });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.query;

        // Validate ID
        if (!id) {
          return res.status(400).json({ error: 'Employee ID is required' });
        }

        // Find employee
        const employeeIndex = employees.findIndex(emp => emp.id === id);
        if (employeeIndex === -1) {
          return res.status(404).json({ error: 'Employee not found' });
        }

        // Instead of deleting, archive the employee
        employees[employeeIndex] = {
          ...employees[employeeIndex],
          isActive: false,
          archivedAt: new Date().toISOString(),
        };

        // In production, this would be a database update
        await prisma.employee.update({
          where: { id },
          data: {
            isActive: false,
            archivedAt: new Date(),
          },
        });

        res.status(200).json({ message: 'Employee archived successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to archive employee' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
} 