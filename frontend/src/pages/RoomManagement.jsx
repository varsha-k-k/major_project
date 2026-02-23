import { useEffect, useState } from "react";
import axios from "axios";

function RoomManagement() {

  const [rooms, setRooms] = useState([]);

  const [newRoom, setNewRoom] = useState({
    room_type: "",
    price_per_night: "",
    total_rooms: "",
    available_rooms: ""
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {

    try {

      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:3000/api/rooms",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setRooms(res.data);

    } catch (err) {

      console.error(err);

    }

  };

  const handleAddRoom = async () => {

    try {

      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:3000/api/rooms",
        newRoom,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Room added");

      fetchRooms();

    } catch (err) {

      console.error(err);

      alert("Error adding room");

    }

  };

  const updateRoom = async (room_id, field, value) => {

    try {

      const token = localStorage.getItem("token");

      await axios.patch(
        `http://localhost:3000/api/rooms/${room_id}`,
        {
          [field]: value
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchRooms();

    } catch (err) {

      console.error(err);

    }

  };

  return (
    <div style={{ padding: "20px" }}>

      <h2>Room Management</h2>

      {/* Add Room */}
      <div>

        <h3>Add Room</h3>

        <input
          placeholder="Room Type"
          onChange={(e) =>
            setNewRoom({
              ...newRoom,
              room_type: e.target.value
            })
          }
        />

        <input
          placeholder="Price"
          onChange={(e) =>
            setNewRoom({
              ...newRoom,
              price_per_night: e.target.value
            })
          }
        />

        <input
          placeholder="Total Rooms"
          onChange={(e) =>
            setNewRoom({
              ...newRoom,
              total_rooms: e.target.value
            })
          }
        />

        <button onClick={handleAddRoom}>
          Add Room
        </button>

      </div>

      <hr />

   

    </div>
  );

}

export default RoomManagement;
