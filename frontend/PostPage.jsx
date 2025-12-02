import { useState } from "react";

function PostPage() {
    const [id,setId] = useState("")
    const [result,setResult] = useState(null)
    const [error, setError] = useState("")


    const getPost = async () => {

        try {
            setResult(null)
            setError("")

            if (!id.trim()) {
                setError("Please enter an ID");
                return
            }
            const response = await fetch(`/posts/${encodeURIComponent(id)}`);

            if(!response.ok) {
                throw new Error("Failed to fetch post")
            }
            const data = await response.json();
            setResult(data);


        }

        catch (error) {
            setError(error.message || "Failed to fetch post.")



        }

    }





    return (

        <>

        <input 
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder="Please enter an ID"
        />

        <button onClick={getPost}>Get Post</button>

        {error && <p style={{color:"red"}}>{error}</p>}

        {result && (


            <div>
                <p>{result.title}</p>
                <p>{result.body}</p>

            </div>
        )}
        
        
        </>
    )


}

export default PostPage;