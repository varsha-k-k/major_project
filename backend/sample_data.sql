-- Sample data for Smart Hospitality System
-- Run this after creating the tables

-- Insert sample hotel
INSERT INTO hotels (hotel_name, location, address, contact_phone, contact_email, description, languages_supported, slug)
VALUES (
  'Grand Palace Hotel',
  'Kochi, Kerala',
  'MG Road, Kochi, Kerala 682016',
  '+91-484-1234567',
  'info@grandpalace.com',
  'A luxurious 5-star hotel in the heart of Kochi with modern amenities and traditional Kerala hospitality.',
  ARRAY['English', 'Malayalam', 'Hindi'],
  'grand-palace-hotel'
);

-- Insert staff user (password is 'staff123' - plain text for development)
INSERT INTO staff_users (hotel_id, name, email, password_hash, role)
VALUES (
  1,
  'John Manager',
  'staff@grandpalace.com',
  'staff123',
  'admin'
);

-- Insert rooms
INSERT INTO rooms (hotel_id, room_type, price_per_night, total_rooms, available_rooms)
VALUES
  (1, 'Deluxe Single', 5000.00, 20, 15),
  (1, 'Deluxe Double', 7000.00, 15, 12),
  (1, 'Executive Suite', 12000.00, 8, 6),
  (1, 'Presidential Suite', 25000.00, 2, 2);

-- Insert some bookings for occupancy calculation
INSERT INTO bookings (hotel_id, room_id, guest_name, guest_phone, check_in_date, check_out_date, booking_status, payment_status)
VALUES
  (1, 1, 'Rajesh Kumar', '+91-9876543210', '2024-02-25', '2024-02-27', 'confirmed', 'paid'),
  (1, 2, 'Priya Sharma', '+91-9876543211', '2024-02-26', '2024-02-28', 'confirmed', 'paid'),
  (1, 1, 'Amit Patel', '+91-9876543212', '2024-02-24', '2024-02-26', 'confirmed', 'paid'),
  (1, 3, 'Sneha Reddy', '+91-9876543213', '2024-02-27', '2024-03-01', 'confirmed', 'paid'),
  (1, 2, 'Vikram Singh', '+91-9876543214', '2024-02-28', '2024-03-02', 'confirmed', 'paid');

-- Insert analytics summary
INSERT INTO analytics_summary (hotel_id, date, total_bookings, occupancy_rate, most_booked_room)
VALUES
  (1, CURRENT_DATE, 5, 35.0, 'Deluxe Single');