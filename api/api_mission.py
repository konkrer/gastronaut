"""API endpoints for missions CRUD, etc."""


from flask import request, Blueprint, jsonify, g
from werkzeug.exceptions import Unauthorized
from models import db, Mission, UserMission, Business
from static.py_modules.decorators import add_user_to_g
from static.py_modules.helper_functions import HelperFunctions as H


api_mission_b_p = Blueprint('API_mission_blueprint', __name__,)


#        $$      $$$$$$    $$
#       $$$$     $$   $$   $$
#       $$$$     $$   q$m  $$
#      $$  $$    $$$$$$$   $$
#     $$$$$$$-   $$        $$
#     $$    $$   $$        $$
#    $$     i$$  $$        $$
############################
"""API Endpoints."""


@api_mission_b_p.route('/<mission_id>')
@add_user_to_g
def load_mission(mission_id):
    """Endpoint to return a mission and all business on that mission.
       Used by mission-control."""

    if not g.user:
        return Unauthorized()

    mission = Mission.query.get_or_404(mission_id)

    user_mission = UserMission.query.filter_by(
        user_id=g.user.id, mission_id=mission.id).one()

    businesses = [b.serialize() for b in mission.businesses]

    businesses.sort(key=lambda x: x['name'].lower())

    for b in businesses:
        if b['id'] in user_mission.goals_completed:
            b['completed'] = True

    mission_dict = mission.serialize()
    # If user liked this mission set user_liked flag.
    if g.user.id == mission.editor or g.user.id in mission.likes:
        mission_dict['user_liked'] = True
    # If this mission is a creation of this user set editor to True.
    if g.user.id == mission.editor:
        mission_dict['editor'] = True
    else:
        mission_dict['editor'] = False
        mission_dict['username'] = mission.author.username

    return jsonify({'mission': mission_dict, 'businesses': businesses})


@api_mission_b_p.route('', methods=['POST'])
@add_user_to_g
def create_mission():
    """Endpoint to create a mission."""

    if not g.user:
        return Unauthorized()

    try:
        mission = Mission.create(editor=g.user.id, **request.json)
        db.session.commit()
        g.user.missions.append(mission)
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': repr(e)})

    return jsonify({'success': 'Mission Created!',
                    'mission': mission.serialize()})


@api_mission_b_p.route('', methods=['PUT'])
@add_user_to_g
def update_mission():
    """Endpoint to update a mission."""

    note = {}

    data = request.json
    mission = Mission.query.get_or_404(data['id'])

    if not g.user.id == mission.editor:
        return Unauthorized()

    if data.get('is_public'):
        if len(mission.businesses):
            mission.share()
        else:
            note['note'] = 'You cannot share a mission without goals.'

        del data['is_public']
    else:
        data['is_public'] = False

    mission.update(**data)

    try:
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': repr(e)})

    return jsonify({
        'success': 'updated',
        'mission': mission.serialize(),
        **note
    })


@api_mission_b_p.route('/<mission_id>', methods=['DELETE'])
@add_user_to_g
def delete_mission(mission_id):
    """Endpoint to delete a mission."""

    if not g.user:
        return Unauthorized()

    mission = Mission.query.get_or_404(mission_id)
    g.user.missions.remove(mission)

    db.session.commit()

    # if mission was shared and is in use or a report was written don't delete.
    if (mission.date_shared and mission.user_missions) or mission.reports:
        mission.is_public = False
        mission.editor = 2
        db.session.commit()
        return jsonify({'success': 'Mission Deleted!'})

    try:
        db.session.delete(mission)
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': repr(e)})

    return jsonify({'success': 'Mission Deleted!'})


@api_mission_b_p.route('/add_business/<mission_id>', methods=['POST'])
@add_user_to_g
def add_to_mission(mission_id):
    """Add business to mission endpoint."""

    if not g.user:
        return Unauthorized()

    mission = Mission.query.get_or_404(mission_id)

    data = request.json

    business = Business.query.get(data['id'])

    if business:
        if business in mission.businesses:
            return jsonify({'success': 'Already Added.', 'color': 'warning'})
    else:
        # Index page adds new businesses to DB.
        business = Business.create(
            id=data['id'], name=data['name'], city=data['city'],
            state=data['state'], country=data['country'],
            longitude=float(data['longitude'] or 0),
            latitude=float(data['latitude'] or 0))

    mission.businesses.append(business)

    try:
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Added!', 'color': 'green'})


@api_mission_b_p.route(
    '/remove_business/<mission_id>', methods=['POST'])
@add_user_to_g
def remove_from_mission(mission_id):
    """Endpoint to remove business from mission ."""

    mission = Mission.query.get_or_404(mission_id)

    if not g.user and g.user.id == mission.editor:
        return Unauthorized()

    data = request.json

    business = Business.query.get_or_404(data['business_id'])

    if business not in mission.businesses:
        return jsonify({'success': 'Business not in mission.'})

    mission.businesses.remove(business)
    # don't allow sharing when mission has no businesses.
    if len(mission.businesses) == 0:
        mission.is_public = False

    try:
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Business Removed from Mission!'})


@api_mission_b_p.route('/like/<mission_id>', methods=['POST'])
@add_user_to_g
def like_mission(mission_id):
    """Endpoint to like and un-like missions."""

    if not g.user:
        return Unauthorized()

    mission = Mission.query.get_or_404(mission_id)

    likes = mission.likes.copy()

    if g.user.id in likes:
        likes.remove(g.user.id)
        success = 'removed'
    else:
        likes.add(g.user.id)
        success = 'added'

    mission.likes = likes

    try:
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'feedback': 'Error!'})

    return jsonify({'success': success, 'likes': len(mission.likes)})


@api_mission_b_p.route('/add/<mission_id>', methods=['POST'])
@add_user_to_g
def add_mission(mission_id):
    """Endpoint to add mission to user's missions."""

    if not g.user:
        return Unauthorized()

    mission = Mission.query.get_or_404(mission_id)

    if mission in g.user.missions:
        return jsonify({'success': 'Mission Already Added.'})

    g.user.missions.append(mission)

    try:
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Mission Added!'})


@api_mission_b_p.route('/remove/<mission_id>', methods=['POST'])
@add_user_to_g
def remove_mission(mission_id):
    """Endpoint to remove mission from user's missions."""

    if not g.user:
        return Unauthorized()

    mission = Mission.query.get_or_404(mission_id)

    if mission not in g.user.missions:
        return jsonify({'success': 'Mission Already Removed.'})

    g.user.missions.remove(mission)

    try:
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Mission Removed!'})


@api_mission_b_p.route('/goal_completed/<mission_id>', methods=['POST'])
@add_user_to_g
def goal_completed(mission_id):
    """Endpoint to add/remove business from a mission's goals_completed."""

    if not g.user:
        return Unauthorized()

    user_mission = UserMission.query.filter_by(
        user_id=g.user.id, mission_id=mission_id).one()

    goals_completed = user_mission.goals_completed.copy()

    data = request.json

    if data['business_id'] in goals_completed:
        goals_completed.remove(data['business_id'])
        out = {'success': 'Goal Open!'}
    else:
        goals_completed.append(data['business_id'])
        out = {'success': 'Goal Completed!'}

    user_mission.goals_completed = goals_completed

    try:
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify(out)
