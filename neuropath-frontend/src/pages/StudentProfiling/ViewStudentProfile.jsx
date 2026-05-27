import { useEffect, useState } from "react";
import "../../components/StudentShimmer";
import "../../styles/ViewStudentProfile.css";
import { useAuth } from "../../context/AuthContext";
import StudentShimmer from "../../components/StudentShimmer";

export default function ViewStudentProfile({
  setActivePage,
  setSelectedStudentId,
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Pass the logged-in teacher's User ID so the backend returns only
    // students that belong to this teacher.
    const teacherId = user?.id;
    if (!teacherId) {
      setLoading(false);
      return;
    }

    fetch(`http://localhost:8000/api/users/students/?teacher_id=${teacherId}`)
      .then((res) => res.json())
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="page-content">
        <StudentShimmer />
      </div>
    );
  }

  const handleView = (id) => {
    setSelectedStudentId(id);
    setActivePage("view-student-detail");
  };

  return (
    <div className="page-content">
      <div className="form-card">
        <h2 className="form-section-title">View Student Profiles</h2>

        <table className="student-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Grade</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr key={student.studentID}>
                <td>{student.studentID}</td>
                <td>{student.name}</td>
                <td>{student.grade}</td>
                <td>
                  <button
                    onClick={() => handleView(student.studentID)}
                    className="view-button"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
