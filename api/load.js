export default async function handler(req, res) {

    const userId = req.query.userId;

    res.status(200).json({

        userId: userId,
        data: {}

    });
    
}