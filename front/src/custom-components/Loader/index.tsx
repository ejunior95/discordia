import './styles.css'

export default function Loader() {
    return(
        <div className='w-full h-dvh absolute top-0 left-0 z-50 flex items-center justify-center'>
            <span className="loader"></span>
        </div>
    )
}